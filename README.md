# interview 3

نظام إلكتروني لإدارة مقابلات قسم التقنية الخاصة للصم وضعاف السمع في الكلية التقنية للاتصالات والمعلومات.

## الروابط

- صفحة المتقدمين: https://legend-h-99.github.io/interview-3/?view=applicant
- واجهة GitHub Pages: https://legend-h-99.github.io/interview-3/
- واجهة Sites والـ API: https://interviews-tech-system.hossam-a-m22.chatgpt.site/
- مستودع GitHub: https://github.com/legend-h-99/interview-3
- تصميم Figma: https://www.figma.com/design/fs3ZfNkH2cuzNB2UEUA9Fq
- عرض Figma Slides: https://www.figma.com/slides/MPTZEYsYCXZhjJXFroHW4t

## ما يحتويه النظام

- بوابة متقدمين منفصلة تعرض بعد التقديم الاسم ورقم الانتظار فقط.
- بحث المتقدم بالاسم أو رقم الهوية مع إكمال بيانات القبول المستوردة.
- قبول مدخلات المتقدم بأي لغة، مع دعم الأرقام العربية والفارسية والإنجليزية.
- إدارة شؤون المتدربين، إدارة الكلية، رئيس القسم، ولجان المقابلات.
- اختيار اللجنة أولا ثم اختيار مدرب أو أكثر، مع مترجم اختياري من قائمة ثابتة.
- تقييم المقابلة من 50 درجة يشمل الإشارة، المظهر، المعلومات العامة، سرعة الاستجابة، وبنود نعم/لا.
- رسوم ومؤشرات داخل التقارير والواجهات الداخلية.
- تصدير PDF وExcel/CSV.
- تخزين حقيقي عبر API منشور على Sites مع قاعدة D1.

## التشغيل المحلي

```bash
npm install
npm run dev
```

## الاختبار والبناء

```bash
npm run check
```

أو تشغيل الأوامر منفصلة:

```bash
npm run lint
npm test -- --run
npm run build
```

## النشر

- GitHub Pages يستخدم workflow في `.github/workflows/pages.yml`.
- Sites يستخدم `.openai/hosting.json` وملف worker المبني من `scripts/build-sites-worker.mjs`.
- عند تعديل API أو البيانات الأولية، شغل `npm run build` قبل حفظ نسخة Sites.

## ترتيب الملفات

راجع [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) لمعرفة مكان كل ملف، و[docs/RELEASE_SUMMARY.md](docs/RELEASE_SUMMARY.md) لملخص ما تم إنجازه واختباره.
