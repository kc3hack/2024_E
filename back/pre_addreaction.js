const is_useruuid_SQL = is_SQL + "FROM isreaction WHERE user_uuid = ?;"  //in /addreaction
const is_objuuid_SQL = is_SQL + "FROM isreaction WHERE user_uuid = ? AND JSON_CONTAINS(trueobj_uuid, ?, ?);"  //in /addreaction

const time2_lose_reaction = '00:00:10.000000';  //時:分:秒.000000  in /addreaction



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
  