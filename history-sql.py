#!/usr/local/bin/python


import sys
import json

import MySQLdb

import re
import os
import os.path
import urllib
import urllib.parse
import subprocess
from datetime import datetime
from dateutil import parser
import dateutil
import yaml

dbconfig={}
with open('./db.yml') as f:
    dbconfig=yaml.safe_load(f)

# 2022-01-29 Times are now in datetime strings at UTC

db = MySQLdb.connect(
    host=dbconfig['host'], 
    user=dbconfig['user'], 
    passwd=dbconfig['passwd'], 
    db=dbconfig['db'], 
    charset='utf8', use_unicode=True
)

c=db.cursor()

root='./upload-mnt/Semantic Location History'

for dirpath, dirnames, filenames in os.walk(root):
	for filename in filenames:
		path=dirpath +'/'+ filename

		#if '2017_AUGUST' not in filename:
		#	continue

		print(path)

		with open(path, 'r') as f:
			x=json.load(f)

			for y in x['timelineObjects']:
				k=y.keys()

				if len(k) > 1:
					print('more than one item in dict')
					exit(1)
				if 'activitySegment' in k:
					d=y['activitySegment']

					sql=u"""
						insert into activitysegment
						(start_lat, start_lon, end_lat, end_lon,
						start_time,end_time,distance,
						activityType,confidence,
						source_path)
						values
						(%s, %s, %s, %s, 
						%s, %s,
						%s,
						%s, %s,
						%s)"""


					start_time=dateutil.parser.parse(d['duration']['startTimestamp']).replace(tzinfo=None).isoformat()
					end_time=dateutil.parser.parse(d['duration']['endTimestamp']).replace(tzinfo=None).isoformat()
					#start_time = datetime.utcfromtimestamp(
					#	int(d['duration']['startTimestampMs']) / 1000
					#).isoformat()

					#end_time = datetime.utcfromtimestamp(
					#	int(d['duration']['endTimestampMs']) / 1000
					#).isoformat()

					data=[
						d['startLocation']['latitudeE7'],
						d['startLocation']['longitudeE7'],
						d['endLocation']['latitudeE7'],
						d['endLocation']['longitudeE7'],
						start_time,
						end_time,
						(int(d['distance']) if 'distance' in d else None),
						d['activityType'],
						(d['confidence'] if 'confidence' in d else None),
						path
					]

					print(data)

					c.execute(sql, data)
					db.commit()

					if 'waypointPath' in d:
						activitySegment=c.lastrowid
						i=0
						for x in d['waypointPath']['waypoints']:
							print(x)
							sql=u"""
								insert into waypoints
								(activitySegment, lat, lon, sort)
								values 
								(%s, %s, %s, %s)
							"""

							data=[
								activitySegment,
								x['latE7'], x['lngE7'], i
							]

							print(data)

							c.execute(sql, data)

							db.commit()

							i += 1
					

				elif 'placeVisit' in k:

					d=y['placeVisit']

					def do_placeVisit(data, parent=None):

						sql=u"""
							insert into placevisit 
							(lat, lon, center_lat, center_lon,
							placeId, address, name,
							start_time,end_time,
							confidence, parent,
							source_path)
							values
							(%s, %s, %s, %s,
							%s, %s, %s,
							%s, %s,
							%s, %s,
							%s)"""

						start_time=dateutil.parser.parse(d['duration']['startTimestamp']).replace(tzinfo=None).isoformat()
						end_time=dateutil.parser.parse(d['duration']['endTimestamp']).replace(tzinfo=None).isoformat()
						#start_time = datetime.utcfromtimestamp(
						#	int(d['duration']['startTimestampMs']) / 1000
						#).isoformat()

						#end_time = datetime.utcfromtimestamp(
						#	int(d['duration']['endTimestampMs']) / 1000
						#).isoformat()

						data=[
							(d['location']['latitudeE7'] if 'latitudeE7' in d['location'] else None),
							(d['location']['longitudeE7'] if 'longitudeE7' in d['location'] else None),
							(d['centerLatE7'] if 'centerLatE7' in d else None),
							(d['centerLngE7'] if 'centerLngE7' in d else None),
							(d['location']['placeId'] if 'placeId' in d['location'] else None),
							(d['location']['address'] if 'address' in d['location'] else None),
							(d['location']['name'] if 'name' in d['location'] else None),
							start_time,
							end_time,
							# 2022-01-29: Changed from 'confidence' in JSON
							d['placeConfidence'],
							parent,
							path
						]

						print(data)

						c.execute(sql, data)
						db.commit()

						return c.lastrowid

					parent=do_placeVisit(d, None)

					if 'childVisits' in d:
						for x in d['childVisits']:
							do_placeVisit(x, parent)

				
