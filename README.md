# Font Dock

オープンライセンスのフォントを、好きな文章で比較してダウンロードできるElectronアプリです。

## 起動

Node.js と npm がインストールされた環境で、次のコマンドを実行してください。

```bash
./start.sh
```

初回は必要なパッケージをインストールし、ビルド後にアプリを開きます。終了するにはターミナルで `Ctrl+C` を押してください。

## 開発

```bash
npm install
npm run dev
```

ブラウザのみで確認する場合は `npm run dev:web` を使います。ブラウザ版のダウンロードボタンはGoogle Fontsの配布ページを開きます。

## ビルド

```bash
npm run build
npm start
```

掲載フォントはGoogle Fontsで公開されているSIL Open Font Licenseのフォントです。利用時は各フォントに同梱されるライセンス文書を確認してください。
