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
    owner_uuid VARCHAR(40),
    latitude DECIMAL(11,8),
    longitude DECIMAL(11,8),
    latlon GEOMETRY SRID 4326 NOT NULL,
    altitude DECIMAL(11,8), 
    objectdegree FLOAT,
    data TEXT NOT NULL,

    SPATIAL INDEX(latlon)
);
/*altitudeの単位m*/

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
    "user_id": "testuser",
    "pass": "testpass"
}

/* putgeoobject */
{
    "user_id": "testuser",
    "pass": "testpass",
    "type": "BOARD",
    "latitude": 35.52345258,
    "longitude": 135.29266771,
    "altitude": 1.592,
    "objectdegree": 155.44,
    "data": "日本のどこか"
}

/* geoobject */
{
    "here_lat": 35.52389021,
    "here_lon": 135.3252324,
    "quantitylimit": 50
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