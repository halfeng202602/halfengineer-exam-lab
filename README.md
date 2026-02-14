# halfengineer-exam-lab

Claude のプロジェクト機能だけで動く、資格試験対策ダッシュボード。

サーバーなし。DBなし。デプロイなし。jsxファイル1つとプロジェクト設定だけ。

## 収録

| 試験 | ディレクトリ | パート数 | サブカテゴリ |
|------|-------------|---------|-------------|
| TOEIC Reading | `toeic/` | 3（Part5-7） | スキル 4種 |

## 使い方

1. Claude.ai でプロジェクトを新規作成
2. 各ディレクトリの `README.md` を参考にプロジェクト説明を設定（Claudeに「この試験用の設定考えて」と言えばOK）
3. jsx ファイルの内容をアーティファクトとして表示
4. 「問題出して」で演習開始

詳しくは各ディレクトリの README を参照。

## 横展開

パートとサブカテゴリを差し替えれば、どんな試験にも応用可能。

- AWS認定、簿記、ITパスポート 等
- 差し替え方がわからなければ、Claudeに聞けばやってくれる

## 関連

- [halfengineer-sdd-lab](https://github.com/halfeng202602/halfengineer-sdd-lab) - AI開発用 SDD テンプレート

## 注意事項

- 本リポジトリは ETS とは一切関係ありません（非公認・非提携）
- 演習問題は **Claude が生成するオリジナル問題** であり、TOEIC 公式の過去問・予想問題ではありません
- ダッシュボードはスコア記録ツールであり、公式テスト内容を含みません

## ライセンス

MIT

---

> TOEIC is a registered trademark of ETS (Educational Testing Service).
