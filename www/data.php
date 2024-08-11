<?php

error_reporting(E_ALL);
ini_set('display_errors', 0);

# vendor/ is in the $DOCROOT directory, but data.php (this file) is in $DOCROOT/www
require_once '../vendor/autoload.php';



$loader = new Zend\Loader\StandardAutoloader([
        'autoregister_zf'               => true,
        'fallback_autoloader'   => true,
	]
);



$loader->register();
$cmloader = new Zend\Loader\ClassMapAutoloader();

$dbconfig = yaml_parse_file('../db.yml');

$adapter = new Zend\Db\Adapter\Adapter([
	'driver'	=> 'Pdo',
	'dsn'		=> 'mysql:dbname='. $dbconfig['db'] .';host='. $dbconfig['host'] .';charset=utf8',
	'username'	=> $dbconfig['user'],
	'password'	=> $dbconfig['passwd'],
	'charset'	=> 'utf8'

]);

Zend\Db\TableGateway\Feature\GlobalAdapterFeature::setStaticAdapter($adapter);



function getTable($table, $adapter) {
	return new \Zend\Db\TableGateway\TableGateway($table, $adapter, array(
		new \Zend\Db\TableGateway\Feature\GlobalAdapterFeature(),
		new \Zend\Db\TableGateway\Feature\RowGatewayFeature('id')
	));
}



$activitysegment = getTable('activitysegment', $adapter);
$placevisit = getTable('placevisit', $adapter);
$waypoints = getTable('waypoints', $adapter);
$history = getTable('history', $adapter);


switch ($_SERVER['REQUEST_METHOD']) {

	case 'GET':
		$range_start = $_GET['range_start'];
		$range_end = $_GET['range_end'];

		if (!isset($range_start) || !isset($range_end)) {
			echo json_encode([]);
		} else {

				$where = new Zend\Db\Sql\Where();
				$where->between('start_time', $range_start, $range_end);

				$select = $activitysegment->getSql()->select()->where($where);
				$data['activitysegment'] = $activitysegment->selectWith($select)->toArray();

				$select = $placevisit->getSql()->select()->where($where);
				$data['placevisit'] = $activitysegment->selectWith($select)->toArray();

				$data['waypoint_segments'] = [];

				$history->insert([
					'range_start'	=> $range_start,
					'range_end'		=> $range_end,
				]);
				$data['history'] = $history->select()->toArray();

				foreach ($data['activitysegment'] as $k => $activitysegment) {
						$id = $activitysegment['id'];
						$W = $waypoints->select([
							'activitySegment' => $id
						])->toArray();

						usort($W, function ($a, $b) {
							return $a['sort'] < $b['sort'] ? -1 : 1;
						});

						$processed = [];

						for ($i = 0; $i < count($W); $i++) {
							$processed[$i] = [];

							if ($i == 0) {
								$processed[$i]['start_lat'] = $activitysegment['start_lat'];
								$processed[$i]['start_lon'] = $activitysegment['start_lon'];
							} elseif ($i > 0 && $i < count($W)) {
								$processed[$i]['start_lat'] = $W[$i-1]['lat'];
								$processed[$i]['start_lon'] = $W[$i-1]['lon'];
							}

							$processed[$i]['end_lat'] = $W[$i]['lat'];
							$processed[$i]['end_lon'] = $W[$i]['lon'];
						}
				
						if (count($W) > 0) {
								$processed[count($W)] = [
									'start_lat'		=> $W[count($W) - 1]['lat'],
									'start_lon'		=> $W[count($W) - 1]['lon'],

									'end_lat'		=> $activitysegment['end_lat'],
									'end_lon'		=> $activitysegment['end_lon'],
								];
						}

						$data['waypoint_segments'][$id] = $processed;
				}

				echo json_encode($data, JSON_THROW_ON_ERROR);
		}

	break;
}



?>

