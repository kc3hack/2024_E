const mysql = require('mysql');
const express = require('express');
const app = express();
app.use(express.json());

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'pass',
    database: 'ARdatabase'
});
connection.connect((err) => {  //MySQLに接続できないとき
    if (err) {
      console.log('error connecting: ' + err.stack);
    }
    console.log('Connected');
});


const is_user_SQL = "SELECT \
                        CASE WHEN COUNT(*) = 0 THEN '0' ELSE '1' \
                        END COUNT \
                     FROM user WHERE user_id = ? AND pass = ?;"

const here_obj_distance_SQL = `SELECT \
                                  CONCAT('現在地-', object_uuid) AS 'here-obj', \
                                  ST_Distance( ST_GeomFromText( 'POINT( ? ? )', 4326 ), latlon ) AS 'distance' \
                                FROM geoobject \
                                ORDER BY distance ASC \
                                LIMIT ?;`




//既存アカウントにログイン
app.post('/signin', (req,res) => {
  const user_id = req.body.user_id;
  const pass = req.body.pass;

  connection.query(is_user_SQL, [user_id, pass], (err,results) => {
      let result = {};
                
      if (results[0].COUNT == 0) {
        result = {status: false};
        console.log('Failure to sign in');

      } else {
        result = {status: true, user_id: user_id, pass: pass};
        console.log('Success to sign in');
      }

      res.send(JSON.stringify(result));

    });

});



//新しいアカウントを作成
app.post('/signup', (req,res) => {
  const user_id = req.body.user_id;
  const pass = req.body.pass;

  connection.query(is_user_SQL, [user_id, pass], (err,results) => {
      let result = {};
                      
      if (results[0].COUNT == 1) {
        result = {status: false};
        console.log('Failure to sign up: Already created');

      } else {
        connection.query('INSERT INTO user (user_id, pass) VALUES (?, ?)',
                          [user_id, pass]);
        result =  {
                    status: true, 
                    user_id: user_id, 
                    pass: pass
                  };
        console.log(`Success to sign up: user_id=>${user_id}, pass=>${pass}`);
      }

      res.send(JSON.stringify(result));
  
  });

});



//オブジェクトを1件データベースに登録
app.post('/putgeoobject', (req,res) => {
  const user_id = req.body.user_id;
  const pass = req.body.pass;
  const type = req.body.type;
  let owner_uuid = 'dafault';
  const latitude = req.body.latitude;
  const longitude = req.body.longitude;
  const altitude = req.body.altitude;
  const objectdegree = req.body.objectdegree;
  const data = req.body.data;

  connection.query('SELECT user_uuid FROM user WHERE user_id = ? AND pass = ?', 
                    [user_id, pass], (err,results) => {
    let result = {};
    owner_uuid = results[0].user_uuid;  //user_idとpassの組からuser_uuidを取得
    //user_id, passは存在が確認済だからerr分岐は実装しない
    
    connection.query(`INSERT INTO geoobject (type, owner_uuid, latitude, longitude, latlon, altitude, objectdegree, data) \
                      VALUES (?, ?, ?, ?, ST_GeomFromText( 'POINT( ${latitude} ${longitude} )', 4326 ), ?, ?, ?)`,
                      [type, owner_uuid, latitude, longitude, altitude, objectdegree, data], (err,results) => {

      if(err) {
        result = {status: false};
        console.log('Failure to create geoobject');
      } else {
        result =  {
                    status: true, 
                    type: type, 
                    owner_uuid: owner_uuid, 
                    latitude: latitude, 
                    longitude: longitude, 
                    altitude: altitude, 
                    objectdegree: objectdegree, 
                    data: data
                  };
        console.log('Success to create geoobject');
      }

      res.send(JSON.stringify(result));

      });

  });

});



//現在地から近い順にquantitylimitこのオブジェクトを取得
app.post('/getgeoobject', (req,res) => {
  const here_lat = req.body.here_lat;
  const here_lon = req.body.here_lon;
  const quantitylimit = req.body.quantitylimit

  connection.query(here_obj_distance_SQL, [here_lat,here_lon, quantitylimit], (err,results) => {

  })
});



//PORT設定
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}...`));