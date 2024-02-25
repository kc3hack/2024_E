
//Androidのプッシュ通知
export async function notice() {
  const AWS = require('aws-sdk');
  
  // AWSのリージョンを設定
  AWS.config.update({ region: 'us-southeast-1' });

  // メールのサブスクリプションの作成パラメータ
  const subscribeParams = {
    Protocol: 'EMAIL', 
    TopicArn: 'arn:aws:sns:us-east-1:891377166420:kc3-2024',
    Endpoint: 'EMAIL_ADDRESS'
  };

  // SNSのサービスオブジェクトを作成
  const sns = new AWS.SNS({ apiVersion: '2010-03-31' });

  // サブスクリプションの作成
  sns.subscribe(subscribeParams, (err, data) => {
    if (err) {
      console.error(err, err.stack);
    } else {
      console.log("Subscription ARN is " + data.SubscriptionArn);
    }
  });

  // メッセージの送信パラメータ
  const payload = {
    GCM: {
      content_available: true,
      data: {
        type: 'chatType',
        groupId: 'groupId',
        badge: 'badge'
      },
      notification: {
        body: 'message',
        title: 'title',
        badge: 'badge' //バッジ数
      }
    }
  };

  // ペイロードのシリアライズ
  const message = JSON.stringify(payload);

  // メッセージの送信パラメータ
  const publishParams = {
    TargetArn: 'endpointArn',
    MessageStructure: 'json',
    Subject: 'title',
    Message: message
  };

  // メッセージの送信
  sns.publish(publishParams, (err, data) => {
    if (err) {
      console.error(err, err.stack);
    } else {
      console.log("Message sent successfully");
    }
  });
}
