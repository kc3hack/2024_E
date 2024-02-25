INSERT INTO geom (spotname, latlon) VALUES ( 'kandaimae station', ST_GeomFromText('POINT(34.771014 135.506145)', 4326) );
SELECT id, ST_X(latlon), ST_Y(latlon), ST_ASTEXT(latlon) FROM geoobject;
/* POINT(緯度lat 経度lon) */

CREATE TABLE user (
    id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    user_uuid VARCHAR(40) NOT NULL DEFAULT(UUID()),
    user_id VARCHAR(30) NOT NULL,
    pass VARCHAR(30) NOT NULL
);

CREATE TABLE geoobject (
    id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    object_uuid VARCHAR(40) DEFAULT(UUID()),
    type VARCHAR(10) NOT NULL,
    owner_uuid VARCHAR(40) NOT NULL,
    latitude DECIMAL(11,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    latlon GEOMETRY SRID 4326 NOT NULL,
    altitude DECIMAL(11,8) NOT NULL, 
    objectdegree FLOAT NOT NULL,
    data TEXT NOT NULL,
    num bigint(20) NOT NULL DEFAULT(0),

    SPATIAL INDEX(latlon)
);
/* altitudeの単位はm */
/* reaction(=リアクションの総数)の種類増やすときDEFAULT値はJSON_ARRAY(0,0,...)にUPDATE */
/* 既存レコードには「UPDATE geoobject SET reaction = JSON_ARRAY_APPEND(reaction, '$', 0);」 */

CREATE TABLE reaction (
    id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    object_uuid VARCHAR(40) NOT NULL,
    reactuser_uuid VARCHAR(40) NOT NULL,
    reaction_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE isreaction (
    user_uuid VARCHAR(40) NOT NULL,
    trueobj_uuid JSON DEFAULT(JSON_ARRAY( JSON_ARRAY('') )),
    modified2true JSON DEFAULT(JSON_ARRAY( JSON_ARRAY('') ))
);
/* 2次元配列[i][j]
    [ [ '58gfvn2-fwnir4', ... ], [ , ] ]
    iがリアクションの種類、jがtrueであるobject_uuidを格納する場所
    i=0:役に立った
*/



/* 以降試行メモ */
SELECT
    case
    when count(*) = 0 then '0'
    else '1'
    end count
FROM user
WHERE user_id = "testuser" AND pass = "testpass";

INSERT INTO geoobject (type, owner_uuid, latitude, longitude, latlon, altitude, objectdegree, data) VALUES ("SIGN", "4f6d2b32-cc0b-11ee-a3d1-00ffad921c1b", -44.36, 35.62, ST_GeomFromText( 'POINT( -44.36 35.62 )', 4326 ), 1.592, 155.44, "これはCLCから直接INSERTしました");
/* latの範囲：-90°～+90°  lonの範囲：-180°～+180° */

/* signin,signup */
{
    "user_id": "testuser2",
    "pass": "testpass"
}

/* putgeoobject */
{
    "type": "BOARD",
    "user_uuid": "5df808a4-cc6e-11ee-a3d1-00ffad921c1b",
    "latitude": 35.52345258,
    "longitude": 135.29266771,
    "altitude": 1.592,
    "objectdegree": 155.44,
    "data": "kakaiai"
}

/* getgeoobject */
{
    "here_lat": 35.52389021,
    "here_lon": 135.3252324,
    "quantitylimit": 50
}

/* addreaction */
{
    "type": 0,
    "user_uuid": "4f6d2b32-cc0b-11ee-a3d1-00ffad921c1b",
    "object_uuid": "08080eea-cd5a-11ee-a5cc-00ffad921c1b"
}

SELECT ST_Distance_Sphere(
    ( SELECT latlon FROM geoobject WHERE object_uuid='08080eea-cd5a-11ee-a5cc-00ffad921c1b' ),
    ( SELECT latlon FROM geoobject WHERE object_uuid='606164a5-cd5a-11ee-a5cc-00ffad921c1b' )
) AS distance;
/* 出力結果の単位はm */

SELECT ST_Distance_Sphere(
    ST_GeomFromText('POINT(34.81475139 135.57643039)', 4326),
    ST_GeomFromText('POINT(34.81474919 135.57648538)', 4326)
) AS distance;
/* lat,lonは、小数点以下8位のずれで、位置が1mmオーダずれる。 */

SELECT 
    CONCAT('現在地-', object_uuid) AS 'here-obj',
    ST_Distance( ST_GeomFromText( 'POINT(34.254426 135.425853)', 4326 ), latlon ) AS 'distance'
FROM geoobject
ORDER BY distance ASC
LIMIT 200;

SELECT CASE WHEN COUNT(*) = 0 THEN '0' ELSE '1' END COUNT 
FROM isreaction 
WHERE user_uuid = "4f6d2b32-cc0b-11ee-a3d1-00ffad921c1b" 
AND JSON_CONTAINS(trueobj_uuid, '"08080eea-cd5a-11ee-a5cc-00ffad921c1b"', '$[0]');


UPDATE isreaction SET trueobj_uuid = json_remove(trueobj_uuid, '$[0]') 
WHERE user_uuid = "4f6d2b32-cc0b-11ee-a3d1-00ffad921c1b" 
AND JSON_CONTAINS(trueobj_uuid, '"08080eea-cd5a-11ee-a5cc-00ffad921c1b"', '$[0]');

UPDATE geoobject SET reaction = JSON_REPLACE(reaction, '$[0]', 0) WHERE object_uuid = "08080eea-cd5a-11ee-a5cc-00ffad921c1b";

