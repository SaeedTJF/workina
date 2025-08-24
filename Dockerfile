# مرحله اول: بیلد کردن اپلیکیشن
FROM node:22-alpine AS builder

# تنظیم دایرکتوری کاری
WORKDIR /app

# کپی کردن فایل‌های package.json و package-lock.json برای نصب وابستگی‌ها
COPY package.json package-lock.json ./

RUN npm cache clean --force
# نصب وابستگی‌ها با npm
RUN npm ci

# کپی کردن تمامی فایل‌های پروژه
COPY . .

# بیلد کردن اپلیکیشن برای محیط تولید
RUN npm run build

# مرحله دوم: آماده‌سازی برای اجرای اپلیکیشن
FROM node:22-alpine AS runner

# تنظیم دایرکتوری کاری
WORKDIR /app

# تعیین متغیر محیطی برای حالت تولید
ENV NODE_ENV=production

# کپی فایل‌های لازم از مرحله بیلد به مرحله اجرایی
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# باز کردن پورت 3000 برای دسترسی به اپلیکیشن


# دستور اجرا: اجرای سرور Next.js
CMD ["npm", "start"]
