# ترتيب ملفات مشروع interview 3

هذا الملف يوضح مكان كل جزء مهم في النظام بعد الترتيب.

## ملفات التطبيق

- `src/App.tsx`: منطق النظام الكامل والواجهات الداخلية وبوابة المتقدمين والتقارير.
- `src/App.css`: نظام الألوان والتصميم المتجاوب وتنسيقات الطباعة والتقارير.
- `src/App.test.tsx`: اختبارات الواجهات، التسجيل، اللجان، التصدير، والرسوم.
- `src/main.tsx`: نقطة تشغيل React.
- `src/index.css`: إعدادات CSS العامة.
- `src/assets/hero.png`: الصورة المستخدمة في واجهة النظام.

## البيانات

- `data/accepted-applicants.xlsx`: ملف المتقدمين الأصلي بصيغة Excel.
- `data/accepted-applicants.md`: نسخة منظمة من بيانات القبول.
- `src/data/acceptedApplicants.json`: البيانات المحولة التي يستخدمها التطبيق.

## السكربتات

- `scripts/import-accepted-applicants.mjs`: يحول بيانات القبول إلى JSON.
- `scripts/build-sites-worker.mjs`: يبني Worker الخاص بـ Sites ويضيف ملفات الواجهة وAPI والبيانات الأولية.

## قاعدة البيانات والنشر

- `db/schema.ts`: تعريف الجداول للبيئة المنشورة.
- `drizzle/0001_applicants.sql`: SQL لإنشاء جدول المتقدمين.
- `.openai/hosting.json`: ربط مشروع Sites وقاعدة D1.
- `.github/workflows/pages.yml`: نشر GitHub Pages.

## ملفات عامة

- `public/favicon.svg`: أيقونة الموقع.
- `public/icons.svg`: رموز عامة داخل الواجهة.
- `README.md`: ملخص المشروع والروابط وطريقة التشغيل.
- `docs/RELEASE_SUMMARY.md`: ملخص ما تم إنجازه واختباره.

## ملفات يتم توليدها

- `dist/`: ناتج البناء المحلي والنشر. لا يعدل يدويا.
- `node_modules/`: حزم npm. لا يعدل يدويا.
