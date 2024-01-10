
-- automatically generated using phpMyAdmin

CREATE TABLE `activitysegment` (
  `id` int(32) NOT NULL,
  `start_lat` int(11) NOT NULL,
  `start_lon` int(11) NOT NULL,
  `end_lat` int(11) NOT NULL,
  `end_lon` int(11) NOT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime NOT NULL,
  `distance` int(11) DEFAULT NULL,
  `activityType` varchar(32) NOT NULL,
  `confidence` varchar(20) DEFAULT NULL,
  `source_path` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `history` (
  `id` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `range_start` date NOT NULL,
  `range_end` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `placevisit` (
  `id` int(11) NOT NULL,
  `lat` int(11) DEFAULT NULL,
  `lon` int(11) DEFAULT NULL,
  `center_lat` int(11) DEFAULT NULL,
  `center_lon` int(11) DEFAULT NULL,
  `placeId` varchar(64) DEFAULT NULL,
  `address` varchar(1024) DEFAULT NULL,
  `name` varchar(1024) DEFAULT NULL,
  `start_time` datetime DEFAULT NULL,
  `end_time` datetime DEFAULT NULL,
  `confidence` varchar(20) DEFAULT NULL,
  `parent` int(11) DEFAULT NULL,
  `source_path` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `waypoints` (
  `id` int(11) NOT NULL,
  `activitySegment` int(32) NOT NULL,
  `lat` int(11) NOT NULL,
  `lon` int(11) NOT NULL,
  `sort` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


ALTER TABLE `activitysegment`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `placevisit`
  ADD PRIMARY KEY (`id`),
  ADD KEY `parent` (`parent`);

ALTER TABLE `waypoints`
  ADD PRIMARY KEY (`id`),
  ADD KEY `activitySegment` (`activitySegment`);


ALTER TABLE `activitysegment`
  MODIFY `id` int(32) NOT NULL AUTO_INCREMENT;

ALTER TABLE `placevisit`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `waypoints`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;


ALTER TABLE `placevisit`
  ADD CONSTRAINT `placevisit_ibfk_1` FOREIGN KEY (`parent`) REFERENCES `placevisit` (`id`);

ALTER TABLE `waypoints`
  ADD CONSTRAINT `waypoints_ibfk_1` FOREIGN KEY (`activitySegment`) REFERENCES `activitysegment` (`id`);

