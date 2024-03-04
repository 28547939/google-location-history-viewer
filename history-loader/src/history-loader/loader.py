#!/usr/local/bin/python3.9


import sys
import json

import mysql.connector
import argparse

import re
import os
import os.path
from datetime import datetime
from dateutil import parser
import dateutil
import yaml


class loader(): 

    def __init__(self, db, dryrun=True, verbose=False):
        self.cursor=db.cursor()
        self.db=db
        self.verbose=verbose
        self.dryrun=dryrun
        self.placevisit_count=0
        self.waypoint_count=0
        self.activitysegment_count=0

    def insert_waypoint(self, data, parent_id):
        sql=u"""
            insert into waypoints
            (activitySegment, lat, lon, sort)
            values 
            (%s, %s, %s, %s)
        """

        row=[
            parent_id,
            data['latE7'], data['lngE7'], self.waypoint_count
        ]

        if self.verbose:
            print(f'waypoint {self.waypoint_count}: {data}')


        if self.dryrun or self.verbose:
            print(sql % tuple(row))


        if not self.dryrun:
            self.cursor.execute(sql, row)
            self.db.commit()

        self.waypoint_count += 1


    # returns SQL unique ID of inserted row
    def insert_placevisit(self, data, parent_id=None) -> int:
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

        # it appears that in the case of a childVisit, these keys are unset.
        # the easy solution is just to leave them empty and make their SQL columns default to NULL
        try:
            start_time=dateutil.parser.parse(data['duration']['startTimestamp']).replace(tzinfo=None).isoformat()
            end_time=dateutil.parser.parse(data['duration']['endTimestamp']).replace(tzinfo=None).isoformat()
            # 2022-01-29: Changed from 'confidence' in JSON
            placeConfidence=data['placeConfidence']
        except KeyError:
            start_time=None
            end_time=None
            placeConfidence=None
       

        row=[
            (data['location']['latitudeE7'] if 'latitudeE7' in data['location'] else None),
            (data['location']['longitudeE7'] if 'longitudeE7' in data['location'] else None),
            (data['centerLatE7'] if 'centerLatE7' in data else None),
            (data['centerLngE7'] if 'centerLngE7' in data else None),
            (data['location']['placeId'] if 'placeId' in data['location'] else None),
            (data['location']['address'] if 'address' in data['location'] else None),
            (data['location']['name'] if 'name' in data['location'] else None),
            start_time,
            end_time,
            placeConfidence,
            parent_id,
            self.source_path
        ]

        print(f'placevisit {self.placevisit_count}: {row}')

        self.placevisit_count += 1

        if self.dryrun or self.verbose:
            print(sql % tuple(row))

        if not self.dryrun:
            self.cursor.execute(sql, row)
            self.db.commit()

            return self.cursor.lastrowid
        else:
            # dry-run placeholder
            return -1

    def insert_activitysegment(self, data):
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

        start_time=dateutil.parser.parse(data['duration']['startTimestamp']).replace(tzinfo=None).isoformat()
        end_time=dateutil.parser.parse(data['duration']['endTimestamp']).replace(tzinfo=None).isoformat()

        row=[
            data['startLocation']['latitudeE7'],
            data['startLocation']['longitudeE7'],
            data['endLocation']['latitudeE7'],
            data['endLocation']['longitudeE7'],
            start_time,
            end_time,
            (int(data['distance']) if 'distance' in data else None),
            data['activityType'],
            (data['confidence'] if 'confidence' in data else None),
            self.source_path
        ]

        if self.verbose:
            print(f'activitysegment {self.placevisit_count}: {row}')
        
        if self.dryrun or self.verbose:
            print(sql % tuple(row))

        self.activitysegment_count += 1

        
        if not self.dryrun:
            self.cursor.execute(sql, row)
            self.db.commit()

            return self.cursor.lastrowid
        else:
            # dry-run placeholder
            return -1


    def load(self, path):
        # used by the functions we call
        self.source_path=os.path.abspath(path)
        print(f'processing files under {self.source_path}')
        for dirpath, dirnames, filenames in os.walk(path):
            for filename in filenames:
                path=dirpath +'/'+ filename

                if self.verbose:
                    print(f'processing {path}')

                with open(path, 'r') as f:
                    x=json.load(f)

                    for y in x['timelineObjects']:
                        k=y.keys()

                        if len(k) > 1:
                            raise Exception('a JSON object in timelineObjects had more than one key '
                                + ' - this format is most likely unsupported')

                        if 'activitySegment' in k:
                            data=y['activitySegment']

                            parent_id=self.insert_activitysegment(data)

                            if 'waypointPath' in data:
                                activitySegment=parent_id
                                waypoint_count=0
                                for x in data['waypointPath']['waypoints']:
                                    self.insert_waypoint(x, activitySegment)

                        elif 'placeVisit' in k:
                            data=y['placeVisit']

                            parent_id=self.insert_placevisit(data, None)

                            if 'childVisits' in data:
                                for x in data['childVisits']:
                                    self.insert_placevisit(x, parent_id)

        print(dict(filter(
            (lambda x: x[0] in [
                'activitysegment_count', 'waypoint_count', 'placevisit_count'
            ]), vars(self).items())
        ))


def main():
    prs=argparse.ArgumentParser(
        prog='history-loader',
        description='load Google Takeout location history data into an SQL database',
    )

    prs.add_argument('--db-config', required=True, 
        help='a YAML file that specifies the keys: host, user, passwd, db (see db.yml.sample)')
    prs.add_argument('--data-dir', required=True, 
        help='this should be set to the semantic location history sub directory in the google export')
    prs.add_argument('--verbose', default=False, action='store_true',
        help="print records as they're loaded")
    prs.add_argument('--dry-run', default=False, action='store_true',
        help="do not actually insert anything into the database; print out SQL queries")


    args=vars(prs.parse_args())

    with open(args['db_config']) as f:
        dbconfig=yaml.safe_load(f)

# 2022-01-29 Times are now in datetime strings at UTC

    db = mysql.connector.connect(
        host=dbconfig['host'], 
        user=dbconfig['user'], 
        passwd=dbconfig['passwd'], 
        db=dbconfig['db'], 
        charset='utf8', use_unicode=True
    )


    L=loader(db, dryrun=args['dry_run'], verbose=args['verbose'])

    L.load(args['data_dir'])
 


if __name__ == '__main__':
    main()
                
