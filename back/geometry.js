const mysql = require('mysql');
const express = require('express');
const app = express();
app.use(express.json());

let connection;
const istest = 0;
if(istest) {
  connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'pass',
    database: 'ARdatabase'
  });
} else {
  connection = mysql.createConnection({
    host: 'paripari.dix.asia',
    user: 'testuser',
    password: 'testpass',
    database: 'mrdatabase'
  });
}

connection.connect((err) => {  //MySQLに接続できないとき
  if (err) {
    console.log('error connecting: ' + err.stack);
  } else {
    console.log('Connected');
  }
});


//SQL文
const is_SQL = "SELECT \
                  CASE WHEN COUNT(*) = 0 THEN '0' ELSE '1' \
                  END COUNT "
const is_user_SQL = is_SQL + "FROM user WHERE user_id = ?;"  //in /signin,signup
const here_obj_distance_SQL = `SELECT \
                                  object_uuid, \
                                  ST_Distance( ST_GeomFromText( 'POINT( ? ? )', 4326 ), latlon ) AS 'distance' \
                                FROM geoobject \
                                ORDER BY distance ASC \
                                LIMIT ?;`  //in /getgeoobject
const is_useruuid_SQL = is_SQL + "FROM isreaction WHERE user_uuid = ?;"  //in /addreaction
const is_objuuid_SQL = is_SQL + "FROM isreaction WHERE user_uuid = ? AND JSON_CONTAINS(trueobj_uuid, ?, ?);"  //in /addreaction

//広域定数
const quantitylimit_limit = 200;  //in /getgeoobject
const time2_lose_reaction = '00:00:10.000000';  //時:分:秒.000000  in /addreaction

//近距離オブジェクトかどうか判定 bool in /getgeoobject
let distancelevel = (points, thresh=50) => {
  let a;
  if(points.distance <= thresh) a=true;
  else a=false;
  return a;
};



//既存アカウントにログイン
app.post('/signin', (req,res) => {
  const user_id = req.body.user_id;
  const pass = req.body.pass;

  connection.query(is_user_SQL, 
                    user_id, 
                    (err,results) => {
      let result = {};
                
      if (results[0].COUNT == 0) {
        result = {status: false, message: 'Failure to sign in'};
        console.log('Failure to sign in');

      } else {
        result = {status: true, message: '', user_id: user_id, pass: pass};
        console.log('Success to sign in');
      }

      res.send(JSON.stringify(result));

    });

});



//新しいアカウントを作成
app.post('/signup', (req,res) => {
  const user_id = req.body.user_id;
  const pass = req.body.pass;

  connection.query(is_user_SQL, 
                    user_id, 
                    (err,results) => {
    let result = {};
                    
    if (results[0].COUNT == 1) {
      result = {status: false, message: 'Failure to sign up: Already created'};
      console.log('Failure to sign up: Already created');

    } else {
      connection.query('INSERT INTO user (user_id, pass) VALUES (?, ?)',
                        [user_id, pass], (err,results) => {

        if(err) {
          result = {status: false, message: 'Failure to sign up: Incorrect parameters'};
          console.log('Failure to sign up: Incorrect parameters');
        } else {
          result =  {status: true, message: '', user_id: user_id, pass: pass};
          console.log(`Success to sign up: user_id=>${user_id}, pass=>${pass}`);
        }
      });

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
                    [user_id, pass], 
                    (err,results) => {

    let result = {};
    owner_uuid = results[0].user_uuid;  //user_idとpassの組からuser_uuidを取得
    //user_id, passは存在が確認済だからerr分岐は実装しない
    
    //オブジェクト登録
    connection.query(`INSERT INTO geoobject (type, owner_uuid, latitude, longitude, latlon, altitude, objectdegree, data) \
                      VALUES (?, ?, ?, ?, ST_GeomFromText( 'POINT( ${latitude} ${longitude} )', 4326 ), ?, ?, ?)`,
                      [type, owner_uuid, latitude, longitude, altitude, objectdegree, data], 
                      (err,results) => {

      if(err) {
        result = {status: false, message: 'Failure to create geoobject'};
        console.log('Failure to create geoobject');
      } else {
        result =  {
                    status: true, 
                    message: '',
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



//現在地から近い順に指定個数のオブジェクトを取得
app.post('/getgeoobject', (req,res) => {
  const here_lat = req.body.here_lat;
  const here_lon = req.body.here_lon;

  let quantitylimit = quantitylimit_limit;
  if (req.body.quantitylimit >= quantitylimit_limit) { quantitylimit = req.body.quantitylimit; }

  //オブジェクトのobject_uuidおよび現在地との距離を指定個数取得
  connection.query(here_obj_distance_SQL, 
                    [here_lat,here_lon, quantitylimit], 
                    (err,results) => {
    let result = {};

    if(err) {
      result = {status: false, message: 'Failure to get geoobject'};
      console.log('Failure to get geoobject');
      res.send(JSON.stringify(result));

    } else {
      //取得したobject_uuidおよび近距離オブジェクト判定を配列化
      let aroundobj_arr = [];
      let distancelevel_arr = [];
      for (let i=0; i<results.length; i++) {
        aroundobj_arr[i] = results[i].object_uuid;
        distancelevel_arr[i] = distancelevel(results[i]);  //bool
      }

      //object_uuidからそのオブジェクトの各種カラムを取得
      connection.query('SELECT type, owner_uuid, latitude, longitude, altitude, objectdegree, data \
                        FROM geoobject WHERE object_uuid IN (?) ORDER BY FIELD(object_uuid, ?);',
                        [aroundobj_arr, aroundobj_arr], 
                        (err,results) => {
        let getobj_arr = [];

        for (let i=0; i<results.length; i++) {
          getobj_arr[i] = {
                            distancelevel: distancelevel_arr[i],
                            object_uuid: aroundobj_arr[i],
                            type: results[i].type,
                            owner_uuid: results[i].owner_id,
                            latitude: results[i].latitude,
                            longitude: results[i].longitude,
                            altitude: results[i].altitude,
                            objectdegree: results[i].objectdegree,
                            data: results[i].data
                          };
        }

        result = {status: true, message: '', obj: getobj_arr};  //例：個々のlatitudeにアクセスするには result.obj[i].latitude
        console.log('Success to get geoobject');
        res.send(JSON.stringify(result));
      });
      
    }

  });

});



//リアクションをしたとき
app.post('/addreaction', (req,res) => {
  const type = req.body.type;
  const user_uuid = req.body.user_uuid;
  const object_uuid = req.body.object_uuid;

  //reactionテーブルに指定userのレコードがあるかどうか
  connection.query(is_useruuid_SQL, 
                    user_uuid,
                    (err,results) => {
                  
    //reactionテーブルに指定userのレコードがなかったら作る
    if(results[0].COUNT == 0) {
      connection.query(`INSERT INTO isreaction (user_uuid) VALUES (?)`,
                          user_uuid);
    }

    //trueobj_uuidカラムの要素に指定object_uuidがある=リアクション状態かどうか
    connection.query(is_objuuid_SQL, 
                      [user_uuid, `"${object_uuid}"`, `$[${type}]`],
                      (err,results) => {
      let result = {};

      /* 非リアクション状態 → リアクション状態にする */  //******************************************************************
      if(results[0].COUNT == 0) {
        //reactionテーブル内配列に追加
        connection.query('UPDATE isreaction SET trueobj_uuid = JSON_ARRAY_APPEND(trueobj_uuid, ?, ?), \
                                                modified2true = JSON_ARRAY_APPEND(modified2true, ?, now()) \
                          WHERE user_uuid = ?;',
                          [`$[${type}]`, object_uuid, `$[${type}]`, user_uuid]);

        //現在のリアクション数を取得
        connection.query(`SELECT reaction ->> '$[${type}]' AS num FROM geoobject WHERE object_uuid = ?;`,
                            object_uuid, (err,results) => {
          const reaction_num = parseInt(results[0].num);
          
          //リアクション数を増やす
          connection.query('UPDATE geoobject SET reaction = JSON_REPLACE(reaction, ?, ?) WHERE object_uuid = ?;',
                              [`$[${type}]`, reaction_num+1, object_uuid]);
        });

        result = {status: true};
        res.send(JSON.stringify(result));  /////////////////////////////////////////////////////////////////////////////////
        console.log('Changed status: no reaction -> reaction(true)');
      }
      

      /* リアクション状態 → 経過時間によって状態変更するかどうか分岐 */  //**************************************************
      else {
        //trueobj_uuid内の指定object_uuidの要素番号取得
        connection.query('SELECT JSON_SEARCH(trueobj_uuid, "one", ?) AS search FROM isreaction',
                            object_uuid, (err,results) => {
          const objuuid_idx = results[1].search;

          //経過時間取得
          connection.query(`SELECT TIMEDIFF( now(), JSON_EXTRACT(modified2true, ${objuuid_idx}) ) AS timediff \
                            FROM isreaction \
                            WHERE user_uuid = ? \
                              AND JSON_CONTAINS(trueobj_uuid, ?, '$[${type}]');`,
                            [user_uuid, `"${object_uuid}"`], 
                            (err,results) => {
            const timediff = results[0].timediff;

            //リアクション状態 → 変更しない
            if (timediff < time2_lose_reaction) {
              result = {status: true};
              console.log('Not changed status: reaction -> reaction(true)');
            }

            //リアクション状態 → 非リアクション状態にする
            else {
              //trueobj_uuid,modified2trueカラムから指定object_uuidの要素を削除
              connection.query(`UPDATE isreaction \
                                SET trueobj_uuid = JSON_REMOVE(trueobj_uuid, ${objuuid_idx}), \
                                    modified2true = JSON_REMOVE(modified2true, ${objuuid_idx}) \
                                WHERE user_uuid = ? \
                                  AND JSON_CONTAINS(trueobj_uuid, ?, '$[${type}]');`,
                                [user_uuid, `"${object_uuid}"`]);

              result = {status: false};
              console.log('Changed status: reaction -> no reaction(false)');
            }

            res.send(JSON.stringify(result));  ///////////////////////////////////////////////////////////////////////////
          });
        });
      }

    });
  });
});



//PORT設定
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}...`));

const net = require('net');
const server = net.createServer();
server.on('listening', () => {
    const {
        address,
        port,
    } = server.address();
    console.info(`Server started. (IP:port = ${address}:${port})`);
});
server.on('connection', connection => {
    connection.end('HTTP/1.0 200 OK\r\n\r\nok');
});
server.listen(3000, '0.0.0.0');