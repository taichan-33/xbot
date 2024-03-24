# GASによるAI画像のX bot

![73a97b083639a0c28c6ddb2b10a92ceea534bd3b65ffb9a79e3787 49856993](https://github.com/taichan-33/xbot/assets/151983276/1446d8e1-c702-409d-ae48-96eca2b28530)


このリポジトリは、Google Apps Script（GAS）を使用して、画像をGoogle DriveからTwitterに自動投稿するシステムのソースコードを含んでいます。

システムは、OpenAI APIを使用して画像の分析とキャプションの生成を行い、X（旧Twitter）のAPIを使用して投稿を行います。

# 主な機能

• Google Driveの指定フォルダから未投稿の画像をランダムに選択

• OpenAI Vision APIを使用して画像の内容を分析

• OpenAI GPT-4 APIを使用してキャプションを生成

• 生成されたキャプションとハッシュタグを使用してTwitterに投稿

• 投稿済み画像のURLをスプレッドシートに記録し、重複投稿を防止

• 詳細なログ機能とエラーハンドリング

# 設定方法

１．Google Apps Scriptの新しいプロジェクトを作成します。

２．```Code.gs```ファイルにこのリポジトリのソースコードをコピーします。

３．以下の定数を設定します：

•```PROCESSED_FOLDER_ID:``` 処理済み画像を保存するGoogle DriveフォルダのID

•```OPENAI_APIKEY:``` OpenAI APIキー

•```SPREADSHEET_ID:``` ログと投稿済み画像URLを記録するスプレッドシートのID

•```setTwitterKeys()```関数を実行して、Twitter APIキーとアクセストークンを設定します。

５．スプレッドシートに以下のシートを作成します：

•```log```: システムのログを記録するシート

•```投稿後```: 投稿済み画像のURLを記録するシート

•GASプロジェクトのトリガーを設定して、```processImagesAndPostToTwitter()```関数を定期的に実行します。

# 主要な関数

•```processImagesAndPostToTwitter()```: メイン関数。Google Driveから未投稿の画像を選択し、処理を開始します。

•```processImageAndPostToTwitter(fileId)```: 画像を処理し、TwitterにキャプションおよびURLと共に投稿します。

•```callOpenAIWithImage(fileId)```: OpenAI Vision APIを使用して画像の内容を分析します。

•```callChatGptApi(promptText)```: OpenAI GPT-4 APIを使用してキャプションを生成します。

•```postTweetWithImage(imageUrl, postContent)```: TwitterのAPIを使用して、画像とキャプションを投稿します。

•```logImageUrl(imageUrl)```: 投稿済み画像のURLを投稿後シートに記録します。

•```isImageAlreadyPosted(imageUrl)```: 画像がすでに投稿済みかどうかを確認します。

•```logToSheet(logMessage)```: ログメッセージをlogシートに記録します。

# 注意事項

•このシステムを使用するには、有効なOpenAI APIキーとTwitter APIキーが必要です。

•大量の画像を処理する場合、APIの使用制限に注意してください。

•エラーハンドリングとログ機能が実装されていますが、予期しないエラーが発生する可能性があります。

定期的にログを確認することをお勧めします。

•スプレッドシートに```log```と```投稿後```の2つのシートが必要です。

これらのシートがない場合、システムが正しく機能しません。

# フィードバック

このプロジェクトへの貢献を歓迎します。改善点や新機能の提案がある場合は、Issueを作成するか、プルリクエストを送信してください。
# 
このシステムを使用して、AIが生成する魅力的な画像とキャプションをTwitterで共有し、フォロワーを楽しませてください！
