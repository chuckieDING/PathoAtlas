# 🧬 PathoAtlas - 病理知识图谱

全面、结构化、可交互的病理学个人学习平台。

## 功能模块

- **🔬 病理图谱** - 10大器官系统、70+种疾病的详细病理学特征
- **🧪 标记物数据库** - 50+常用免疫组化标记物的判读标准与临床应用
- **⚖️ 鉴别诊断** - 常见鉴别诊断场景与免疫组化标记物组合策略
- **📝 复习测验** - 闪卡式随机复习，自我评估知识掌握程度
- **🔍 全文搜索** - 跨模块搜索疾病、标记物、鉴别诊断

## 器官系统覆盖

乳腺 | 肺部 | 消化道 | 肝脏 | 肾脏 | 甲状腺 | 淋巴造血 | 皮肤 | 妇科 | 泌尿

## 技术栈

- Next.js 16 (App Router + Server Components)
- TypeScript + Tailwind CSS 4
- 结构化 JSON 数据（版本控制友好）
- 暗色/亮色主题自动切换

## 快速开始

```bash
npm install
npm run dev
```

访问 http://localhost:3000

## 数据结构

```
data/
  organs.json          # 器官系统元数据
  markers.json         # IHC标记物数据库
  staging.json         # 分级分期系统
  differentials.json   # 鉴别诊断场景
  diseases/
    breast.json        # 乳腺疾病
    lung.json          # 肺部疾病
    gi.json            # 消化道疾病
    ...
```
