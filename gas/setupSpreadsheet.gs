/**
 * 車両管理ダッシュボード用スプレッドシートの初期設定
 * 
 * 使い方:
 * 1. スプレッドシートを開く
 * 2. 拡張機能 → Apps Script
 * 3. このファイルの内容を貼り付けて保存
 * 4. 関数「setupDashboardSheets」を選んで「実行」
 * 5. 初回は権限の承認が必要です
 * 
 * 実行後は「車両」「サマリー」シートができているので、あとは直接編集するだけです。
 */
function setupDashboardSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // ========== シート「車両」 ==========
  let sheetVehicle = ss.getSheetByName('車両');
  if (!sheetVehicle) {
    sheetVehicle = ss.insertSheet('車両', 0);
  }
  const vehicleHeaders = [
    'id', '名前', '年', '画像URL', 'ステータス', '利益スコア', '予想利益円', '予想利益USD', '走行距離', 'オークション評価', 'フォルダURL'
  ];
  sheetVehicle.getRange(1, 1, 1, vehicleHeaders.length).setValues([vehicleHeaders]);
  sheetVehicle.getRange(1, 1, 1, vehicleHeaders.length).setFontWeight('bold');
  // 2行目以降は空のまま（アプリで「車両を追加」するか、直接入力）

  // ========== シート「サマリー」 ==========
  let sheetSummary = ss.getSheetByName('サマリー');
  if (!sheetSummary) {
    sheetSummary = ss.insertSheet('サマリー', 1);
  }
  const summaryHeaders = ['入札中', '在庫数', '月間利益円', '月間利益USD'];
  sheetSummary.getRange(1, 1, 1, summaryHeaders.length).setValues([summaryHeaders]);
  sheetSummary.getRange(1, 1, 1, summaryHeaders.length).setFontWeight('bold');
  sheetSummary.getRange(2, 1, 2, summaryHeaders.length).setValues([[0, 0, 0, 0]]);

  SpreadsheetApp.getUi().alert('設定完了しました。\n「車両」「サマリー」シートを用意しました。あとは直接編集してください。');
}
