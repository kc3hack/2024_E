const mysql = require('mysql');
const express = require('express');
const app = express();
app.use(express.json());

let connection;
const istest = 1;
if(istest) {
  connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'D1g5dai31',
    database: 'mrdatabase'
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
const is_user_SQL = "SELECT \
                        CASE WHEN COUNT(*) = 0 THEN '0' ELSE '1' \
                        END COUNT \
                     FROM user WHERE user_id = ? AND pass = ?;"  //in /signin,signup

const here_obj_distance_SQL = `SELECT \
                                  object_uuid, \
                                  ST_Distance( ST_GeomFromText( 'POINT( ? ? )', 4326 ), latlon ) AS 'distance' \
                                FROM geoobject \
                                ORDER BY distance ASC \
                                LIMIT ?;`  //in /getgeoobject

const reaciton_SQL ="SELECT CASE WHEN COUNT(*) = 0 THEN '0' ELSE '1' \
END COUNT FROM reaction WHERE  object_uuid =? AND reactuser_uuid = ?;"

const quantitylimit_limit = 200;  //in /getgeoobject

//近距離オブジェクトかどうか判定 in /getgeoobject
let distancelevel = (points, thresh=20) => {
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
                    [user_id, pass], 
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
                    [user_id, pass], 
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
    connection.query(`INSERT INTO geoobject (type, owner_uuid, latitude, longitude, latlon, altitude, objectdegree, data,num) \
                      VALUES (?, ?, ?, ?, ST_GeomFromText( 'POINT( ${latitude} ${longitude} )', 4326 ), ?, ?, ?, ? )`,
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
                    data: data,
                    num:num
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
  if (req.body.quantitylimit < quantitylimit_limit) { quantitylimit = req.body.quantitylimit; }

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
        distancelevel_arr[i] = distancelevel(results[i]);
      }
      console.log(distancelevel_arr)

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

// app.post('/api/addreaction ', (req, res) =>{
// const user_uuid = req.body.user_id;
// const time = req.body. reaction_time;
// let nowtime = new Date();

// connection.query(reaciton_SQL, 
//   [object_uuid, owner_uuid,], 
//   (err,results) => {
// let result = {};//true false
// if (results[0].COUNT == 0) {

//   //falseの処理 
// }

// else{

//   connection.query('SELECT reaction_time FROM reaction',[reaction_time],(err,results)=>{
//   let result = {};
  
  
// })

  

// const diffMiSec2 = nowtime.getTime() - results[0].reaction_time.getTime();
// const diffHour = diffMiSec2 / (60 * 60 * 1000);



// connection.query('SELECT user_uuid FROM user WHERE user_id = ? AND pass = ?', 
//                     [user_id, pass], 
//                     (err,results) => {

//     let result = {};
//     reactuser_uuid = results[0].user_uuid;

//     connection.query(`INSERT INTO reaction ( owner_uuid, object_uuid, reaction_time) \
//                       VALUES (?, ?, ?)`,
//                       [object_uuid, owner_uuid,reaction_time], 
//                       (err,results) => {

//     if(err) {
//       result = {status: false, message: 'Failure to add reaction'};
//       console.log('Failure add reaction');
//     } else {

//     if(diffHour > 3){
//       result =  {
//                   status: true, 
                  
                  
//                   owner_uuid: owner_uuid, 
                 
//                 };
//       console.log('Success to create geoobject');
//     }else{
//       result = {status: false, message: 'Failure to add: Incorrect parameters'};
//           console.log('Failure to add: Incorrect parameters');
//     }

//     res.send(JSON.stringify(result));

//     }}););}};

// }));

app.post('/addreaction', (req, res) =>{
  //const time = req.body.reaction_time;
  const user_id = req.body.user_id;
  const pass = req.body.pass;
  const reactuser_uuid =req.body.user_uuid;
  const object_uuid =req.body.object_uuid;
  

  let nowtime = new Date();


  connection.query(reaciton_SQL, 
    [object_uuid, reactuser_uuid], 
    (err,results) => {
  let result = {};//true false
 if (results[0].COUNT == 0) {

    connection.query(`INSERT INTO reaction (object_uuid,reactuser_uuid) \
    VALUES (?, ?)`,
    [object_uuid,reactuser_uuid], 
    (err,results) => {

      if(err) {
        result = {status: false, message: 'Failure to add reaction'};
        console.log('Failure to add reaction');
      } else {
        result =  {
          status: true, 
                      
          object_uuid:object_uuid,           
          reactuser_uuid: reactuser_uuid
                  };
        console.log('Success to add reaction');
      }

      
  
    });
    connection.query('UPDATE `geoobject` SET num = num + 1 WHERE object_uuid = ?',
    [object_uuid], (err,results) =>{
      result = {status: true,message: ''}


    });


    
    //falseの処理 
  }
  else{
    connection.query('SELECT reaction_time FROM reaction WHERE object_uuid = ? AND reactuser_uuid = ?;',[object_uuid, reactuser_uuid],(err,results)=>{
      let result = {};
      let test ={};
      test={
        reaction_time:results[0].reaction_time

      };
      const diffMiSec2 = nowtime.getTime() - results[0].reaction_time.getTime();
      const diffHour = diffMiSec2 / (60 * 60 * 1000);
      



   

    // connection.query('SELECT user_uuid FROM user WHERE user_id = ? AND pass = ?', 
    //                 [user_id, pass], 
    //                 (err,results) => {

    //let result = {};
    //reactuser_uuid = results[0].user_uuid;

    

     // if(err) {
       // result = {status: false, message: 'Failure to add reaction'};
        //console.log('Failure add reaction');
      //} else {
        if(diffHour > 0){
          connection.query(`UPDATE reaction SET reaction_time = NOW() WHERE object_uuid = ? AND reactuser_uuid = ? ;\
          `,
          [object_uuid, reactuser_uuid], 
          (err,results) => {
            //let result = {};
            result = {status: true,message: ''}
            // result =  {
            //   // status: true, 
                          
            //   // object_uuid:object_uuid,           
            //   // reactuser_uuid: reactuser_uuid
            //           };
           // console.log(`Listening on port ${diffHour}...`);
            
            


        
          });

          connection.query('UPDATE `geoobject` SET num = num + 1 WHERE object_uuid = ?',
          [object_uuid], (err,results) =>{
          result = {status: true,message: ''}


           });



        }
        else{
          result = {status: false, message: 'Failure to add: Please wait until you can repost'};
              console.log('Failure to add: Please wait until you can repost');
        }
    
        


      //}



   // });          
       });
   }
  res.send(JSON.stringify(result));

});
 });








//PORT設定
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}...`));