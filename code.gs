const PROCESSED_FOLDER_ID = ''; // 処理済み画像を移動するフォルダのID
const OPENAI_APIKEY = ''; // OpenAI GPT APIキー
const SPREADSHEET_ID = '';

const systemPrompt = `
Think in English, output in English.

Constraints
You are an artistic Instagram posting bot!
Please post artwork.

Posting Restrictions Must be adhered to.

Important Points to Adhere To
Please express the image of the picture in one stylish line like an author.
Your post must include 3 hashtags.
Include one coined word combined from the hashtags.

Choose from the following types of hashtags
In addition to the designated hashtags, you can also come up with your own hashtag theme based on the content of the image:
AI Art", "Real or Virtual", "Chaos", "Hallucination", "Psychedelic", "Virtual Space", "Dream", "Fantastic", "Artwork", "Illusion", "Art", "Artist", "Creator", "AI Artist".

The text in your post should only be one line, other than the hashtags.

Submission Restrictions Must be adhered to.
`

function setTwitterKeys() {
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty('TWITTER_CONSUMER_KEY', '');
  scriptProperties.setProperty('TWITTER_CONSUMER_SECRET', '');
  scriptProperties.setProperty('TWITTER_ACCESS_TOKEN', '');
  scriptProperties.setProperty('TWITTER_ACCESS_SECRET', '');
  logToSheet('Twitter API keys set.');
}

function getTwitterService() {
  const scriptProperties = PropertiesService.getScriptProperties();

  // OAuth1.0aサービスの作成
  var service = OAuth1.createService('Twitter')
    .setAccessTokenUrl('https://api.twitter.com/oauth/access_token')
    .setRequestTokenUrl('https://api.twitter.com/oauth/request_token')
    .setAuthorizationUrl('https://api.twitter.com/oauth/authorize')
    .setConsumerKey(scriptProperties.getProperty('TWITTER_CONSUMER_KEY'))
    .setConsumerSecret(scriptProperties.getProperty('TWITTER_CONSUMER_SECRET'))
    .setAccessToken(scriptProperties.getProperty('TWITTER_ACCESS_TOKEN'), scriptProperties.getProperty('TWITTER_ACCESS_SECRET'));

  logToSheet('Twitter service initialized.');

  // 修正: 正しく設定されたOAuth1.0aサービスを返す
  return service;
}


function uploadMediaToTwitter(imageUrl) {
  try {
    logToSheet('Starting to fetch image from Google Drive.');

    var fileId = extractFileIdFromUrl(imageUrl);
    var fileBlob = DriveApp.getFileById(fileId).getBlob();
    logToSheet('Image fetched from Google Drive.');

    // 画像をBase64エンコードする
    var base64Image = Utilities.base64Encode(fileBlob.getBytes());

    const payload = {
      'media_data': base64Image
    };

    const requestData = {
      'method': 'post',
      'payload': payload,
      'muteHttpExceptions': true
    };

    logToSheet('Sending image upload request to Twitter.');
    const uploadUrl = 'https://upload.twitter.com/1.1/media/upload.json';
    const twitterService = getTwitterService();
    const response = twitterService.fetch(uploadUrl, requestData);
    const responseText = response.getContentText();

    if (!responseText) {
      Logger.log('Empty response received from Twitter API.');
      logToSheet('Empty response received from Twitter API.');
      return null;
    }

    try {
      const json = JSON.parse(responseText);

      if (!json || json.error || !json.media_id_string) {
        Logger.log('Error uploading media to Twitter: ' + JSON.stringify(json));
        logToSheet('Error uploading media to Twitter: ' + JSON.stringify(json));
        return null;
      }

      logToSheet('Image uploaded to Twitter successfully. Media ID: ' + json.media_id_string);
      return json.media_id_string;
    } catch (error) {
      Logger.log('Error parsing JSON response: ' + error.toString());
      logToSheet('Error parsing JSON response: ' + error.toString());
      return null;
    }
  } catch (error) {
    Logger.log('Error in uploadMediaToTwitter: ' + error.toString());
    logToSheet('Error in uploadMediaToTwitter: ' + error.toString());
    return null;
  }
}



function extractFileIdFromUrl(url) {
  var match = url.match(/id=([^&]+)/);
  return match ? match[1] : null;
}



function getBase64FromImageUrl(imageUrl) {
  try {
    // Google DriveのファイルIDを取得するためにURLを解析
    var fileId = imageUrl.match(/[-\w]{25,}/);

    // fileIdが正しく取得できなかった場合はエラーを返す
    if (!fileId) {
      Logger.log('Invalid Image URL');
      return null;
    }

    // Google Driveからファイルを取得
    var file = DriveApp.getFileById(fileId[0]);
    
    // ファイルのBlob（バイナリデータ）を取得
    var blob = file.getBlob();

    // BlobをBase64エンコードした文字列に変換
    var base64 = Utilities.base64Encode(blob.getBytes());

    return base64;
  } catch (error) {
    Logger.log('Error in getBase64FromImageUrl: ' + error.toString());
    return null;
  }
}

function getTemporaryPublicUrl(fileId) {
  try {
    var file = DriveApp.getFileById(fileId);
    var url = file.getUrl();
    
    // ファイルの共有設定を変更して、一時的に公開状態にする
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // 公開URLを返す
    return url;
  } catch (error) {
    Logger.log('Error in getTemporaryPublicUrl: ' + error.toString());
    return null;
  }
}

function processImagesAndPostToTwitter() {
  var folder = DriveApp.getFolderById(PROCESSED_FOLDER_ID);
  var files = folder.getFiles();
  var fileList = [];

  // フォルダ内のすべてのファイルを配列に追加
  while (files.hasNext()) {
    var file = files.next();
    fileList.push(file);
  }

  var attemptCount = 0; // 投稿試行回数のカウンタ

  // ファイルリストからランダムに1つ選択し、未投稿のものが見つかるまで繰り返す
  while (fileList.length > 0 && attemptCount < fileList.length) {
    var randomIndex = Math.floor(Math.random() * fileList.length);
    var selectedFile = fileList.splice(randomIndex, 1)[0]; // 選択されたファイルを配列から削除
    var imageUrl = getPublicImageUrl(selectedFile.getId());

    // 重複投稿チェック
    if (!isImageAlreadyPosted(imageUrl)) {
      var success = processImageAndPostToTwitter(selectedFile.getId());
      if (success) {
        Logger.log('Image processed and posted to Twitter.');
        break;
      }
    }

    attemptCount++; // 試行回数をインクリメント
  }

  if (attemptCount >= fileList.length) {
    Logger.log('No new images to post to Twitter.');
  }
}



function processImageAndPostToTwitter(fileId) {
  // 異常値チェック
  if (!fileId) {
    Logger.log('Error: fileId is not defined.');
    return false;
  }

  // Google DriveのファイルIDから画像の公開URLを取得
  var imageUrl = getPublicImageUrl(fileId);

  // 重複投稿チェック
  if (isImageAlreadyPosted(imageUrl)) {
    Logger.log('Image already posted: ' + imageUrl);
    return false; // この画像はすでに投稿されている場合、falseを返す
  }

  // 画像分析、GPT APIに画像の説明を渡して投稿内容を生成
  var imageDescription = callOpenAIWithImage(fileId);
  var postContent = callChatGptApi(imageDescription);

  // 投稿内容を整形してTwitterに投稿し、結果を取得
  var tweetSuccess = postTweetWithImage(imageUrl, postContent);

  // ツイート成功時のみ画像URLを記録
  if (tweetSuccess) {
    logImageUrl(imageUrl);
    logToSheet('Image processed and posted to Twitter. URL: ' + imageUrl);
    return true;
  } else {
    Logger.log('Failed to post tweet for image: ' + imageUrl);
    return false;
  }
}


function callChatGptApi(promptText) {
  const requestOptions = {
    'method': 'post',
    'headers': {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + OPENAI_APIKEY
    },
    'payload': JSON.stringify({
      'model': 'gpt-4-1106-preview',
      'messages': [{'role': 'system', 'content': systemPrompt}, {'role': 'user', 'content': promptText}]
    }),
    'muteHttpExceptions': true
  };

  try {
    logToSheet('GPT API Request sent. Prompt: ' + promptText);

    const response = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', requestOptions);
    const json = JSON.parse(response.getContentText());

    logToSheet('GPT API Response received.');

    if (!json.choices || json.choices.length === 0 || !json.choices[0].message) {
      const errorMessage = 'GPT API returned an unexpected response: ' + response.getContentText();
      Logger.log(errorMessage);
      logToSheet('GPT API Error: Unexpected Response. ' + errorMessage);
      return 'Error: GPT API returned an unexpected response.';
    }

    return json.choices[0].message.content.trim();
  } catch (error) {
    const errorMessage = 'Error calling GPT API: ' + error.toString();
    Logger.log(errorMessage);
    logToSheet('GPT API response received for prompt: ' + promptText);
  return json.choices[0].message.content.trim();
  }
}

function callOpenAIWithImage(fileId) {
  logToSheet('callOpenAIWithImage function started with fileId: ' + fileId);

  try {
    // Google DriveのファイルIDから画像データをBase64形式で取得
    var base64Image = getBase64FromImageUrl(fileId);
    if (!base64Image) {
      throw new Error("Failed to get Base64 image data for fileId: " + fileId);
    }

    var headers = {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + OPENAI_APIKEY
    };

    // Payloadの構築
    var payload = {
      "model": "gpt-4-vision-preview",
      "messages": [
        {
          "role": "user",
          "content": [
            {
              "type": "text",
              "text": "What’s in this image?"
            },
            {
               "type": "image_url",
            "image_url": {
              "url": "data:image/jpeg;base64," + base64Image,
              "detail": "low"
            }
            }
          ]
        }
      ],
      "max_tokens": 300
    };

    var options = {
      "method": "post",
      "headers": headers,
      "payload": JSON.stringify(payload),
      "muteHttpExceptions": true
    };

    // OpenAI APIの呼び出し
    var response = UrlFetchApp.fetch("https://api.openai.com/v1/chat/completions", options);
    var json = JSON.parse(response.getContentText());

    logToSheet('OpenAI Vision API Response: Response received for fileId: ' + fileId);

    if (json.choices && json.choices.length > 0 && json.choices[0].message && json.choices[0].message.content) {
      return json.choices[0].message.content.trim();
    } else {
      throw new Error("Invalid response format from OpenAI Vision API.");
    }
  } catch (error) {
    logToSheet('OpenAI Vision API Error: ' + error.toString() + ' for fileId: ' + fileId);
    Logger.log('Error in callOpenAIWithImage: ' + error.toString());
    return null;
  }
}
function getBase64FromImageUrl(fileId) {
  try {
    // Google Driveからファイルを取得
    var file = DriveApp.getFileById(fileId);
    
    // ファイルのBlob（バイナリデータ）を取得
    var blob = file.getBlob();

    // BlobをBase64エンコードした文字列に変換
    var base64 = Utilities.base64Encode(blob.getBytes());

    return base64;
  } catch (error) {
    Logger.log('Error in getBase64FromImageUrl: ' + error.toString());
    return null;
  }
}

function getPublicUrl(fileId) {
  var file = DriveApp.getFileById(fileId);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  var url = file.getUrl();
  return url;
}


function postTweetWithImage(imageUrl, postContent) {
  try {
    logToSheet('Starting to post tweet with image.');

    // 画像をTwitterにアップロードし、メディアIDを取得
    logToSheet('Uploading media to Twitter.');
    const mediaId = uploadMediaToTwitter(imageUrl);

    if (!mediaId) {
      throw new Error('Failed to upload image to Twitter.');
    }

    logToSheet('Media uploaded to Twitter. Media ID: ' + mediaId);

    // Twitterサービスの取得 (OAuth 1.0a User Context認証)
    const twitterService = getTwitterService();

    // ツイート内容の設定
    const payload = JSON.stringify({
      'text': postContent,
      'media': {
        'media_ids': [mediaId]
      }
    });

    // ツイートを投稿（v2 APIエンドポイントに更新）
    logToSheet('Posting tweet.');
    const response = twitterService.fetch('https://api.twitter.com/2/tweets', {
      'method': 'post',
      'contentType': 'application/json',
      'payload': payload
    });

    // レスポンスの解析とエラーハンドリング
    logToSheet('Analyzing response from Twitter API.');
    const json = JSON.parse(response.getContentText());

    if (json.error) {
      throw new Error('Error posting tweet: ' + json.error.message);
    }

    logToSheet('Tweet posted successfully: ' + postContent);
    return true; // ツイート成功
  } catch (error) {
    const errorMessage = 'Error in postTweetWithImage: ' + error.toString();
    Logger.log(errorMessage);
    logToSheet(errorMessage);
    return false; // ツイート失敗
  }
}


function getPublicImageUrl(fileId) {
  // Google DriveのファイルIDから直接公開URLを生成
  var url = 'https://drive.google.com/uc?export=view&id=' + fileId;
  return url;
}

// 画像URLをスプレッドシートに記録し、ログにも記録する関数
function logImageUrl(imageUrl) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const imageSheet = ss.getSheetByName('投降後'); // 画像URLを記録するシート
  const logSheet = ss.getSheetByName('log') || ss.insertSheet('log'); // ログを記録するシート

  imageSheet.appendRow([imageUrl]); // 画像URLを記録
  logSheet.appendRow([new Date(), 'Logged Image URL: ' + imageUrl]); // ログに記録
}

// 画像がすでに投稿されたかどうかを確認し、結果をログに記録する関数
function isImageAlreadyPosted(imageUrl) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const imageSheet = ss.getSheetByName('投降後'); // 画像URLを確認するシート
  const logSheet = ss.getSheetByName('log') || ss.insertSheet('log'); // ログを記録するシート
  const data = imageSheet.getDataRange().getValues();

  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === imageUrl) {
      logSheet.appendRow([new Date(), 'Image already posted: ' + imageUrl]); // 重複確認ログを記録
      return true;
    }
  }
  logSheet.appendRow([new Date(), 'Image not posted yet: ' + imageUrl]); // 未投稿確認ログを記録
  return false;
}


function logToSheet(logMessage) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const logSheet = spreadsheet.getSheetByName('log') || spreadsheet.insertSheet('log');
  const timestamp = new Date();
  logSheet.appendRow([timestamp, logMessage]);
}

function clear90PercentOfLogSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const logSheet = spreadsheet.getSheetByName("log"); // "log"シートを取得

  if (logSheet !== null) {
    const totalRows = logSheet.getMaxRows();
    const rowsWithData = logSheet.getLastRow();

    // 8000行以上のデータがある場合のみ実行
    if (rowsWithData >= 4000) {
      const rowsToDelete = Math.floor(rowsWithData * 0.9); // 削除する行数（全行数の90%）
      const startRow = 1; // 1行目（通常はヘッダー）は削除しない

      // 指定された行数を削除
      logSheet.deleteRows(startRow, rowsToDelete);

      Logger.log(rowsToDelete + ' rows have been deleted from the log sheet.');
    } else {
      Logger.log('Not enough rows to clear. Total rows with data: ' + rowsWithData);
    }
  } else {
    Logger.log('Log sheet not found.');
  }
}
