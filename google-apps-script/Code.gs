/**
 * 物流システム v3 - Gmail転送用 Google Apps Script
 *
 * 1. Google Apps Scriptで新しいプロジェクトを作成
 * 2. このコードを貼り付け
 * 3. CONFIGのTRANSFER_TOKENとDEFAULT_TOを設定
 * 4. デプロイ > 新しいデプロイ > ウェブアプリ
 *    実行するユーザー: 自分
 *    アクセスできるユーザー: 全員
 * 5. 発行されたウェブアプリURLをv3の設定に入力
 *
 * ブラウザからは text/plain でPOSTされるため、CORSの事前リクエストを避けられます。
 */
const CONFIG = {
  TRANSFER_TOKEN: 'CHANGE_ME_TO_A_LONG_RANDOM_TOKEN',
  DEFAULT_TO: 'CHANGE_ME@example.com',
  SUBJECT_PREFIX: '物流システム QRデータ'
};

function doGet() {
  return ContentService.createTextOutput('logistics-system-v3 transfer endpoint is running.');
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    if (payload.token !== CONFIG.TRANSFER_TOKEN) return out_({ok:false,error:'unauthorized'});
    const to = String(payload.to || CONFIG.DEFAULT_TO).trim();
    if (!to || !/@/.test(to)) return out_({ok:false,error:'invalid recipient'});
    const images = Array.isArray(payload.images) ? payload.images : [];
    if (!images.length) return out_({ok:false,error:'no images'});

    const attachments = images.map((item, i) => {
      const bytes = Utilities.base64Decode(String(item.base64 || ''));
      const name = String(item.name || `QR_${String(i+1).padStart(3,'0')}.png`);
      return Utilities.newBlob(bytes, String(item.mime || 'image/png'), name);
    });

    const subject = `${CONFIG.SUBJECT_PREFIX} ${payload.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd')} (${images.length}枚)`;
    const body = [
      '物流システム v3 からQR画像を受信しました。',
      '',
      `送信日時: ${new Date().toLocaleString('ja-JP')}`,
      `件数: ${images.length}枚`,
      `バッチID: ${payload.batchId || ''}`,
      '',
      '添付画像をPC側の物流システム v3 で読み込んでください。'
    ].join('\n');

    GmailApp.sendEmail(to, subject, body, {attachments: attachments});
    return out_({ok:true,count:images.length,batchId:payload.batchId || ''});
  } catch (err) {
    return out_({ok:false,error:String(err)});
  }
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
