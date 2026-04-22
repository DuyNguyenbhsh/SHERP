import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { TransformInterceptor } from './shared/interceptors/transform.interceptor';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';
import { StripEmptyStringsPipe } from './shared/pipes/strip-empty-strings.pipe';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ── BODY PARSER: nâng giới hạn lên 50MB cho upload Excel/PDF đa dòng ──
  // Mặc định Nest dùng ~100KB → chặn đa số payload multipart/import.
  app.useBodyParser('json', { limit: '50mb' });
  app.useBodyParser('urlencoded', { limit: '50mb', extended: true });

  // ── SECURITY & PERFORMANCE ──
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression());

  // ── COOKIE PARSER: Đọc refresh token từ HttpOnly cookie ──
  app.use(cookieParser());

  // ── CORS: Chỉ cho phép các domain Frontend đã được whitelist truy cập ──
  // Thêm domain Frontend vào biến môi trường ALLOWED_ORIGINS (phân cách bằng dấu phẩy)
  // VD: ALLOWED_ORIGINS=http://localhost:5173,https://wms.sh-group.vn
  const port = process.env.PORT || 3000;
  const allowedOrigins = (
    process.env.ALLOWED_ORIGINS ||
    'http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176'
  )
    .split(',')
    .map((o) => o.trim());

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Cho phép: Postman (không có origin), Swagger UI (same-origin),
      // Vercel preview URLs (*.vercel.app), và whitelist
      if (
        !origin ||
        origin === `http://localhost:${port}` ||
        allowedOrigins.includes(origin) ||
        /\.vercel\.app$/.test(origin)
      ) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Domain ${origin} không được phép truy cập!`));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // ── GLOBAL PREFIX: Mọi route bắt đầu bằng /api ──
  app.setGlobalPrefix('api');

  // ── VALIDATION PIPE TOÀN CỤC ──
  // whitelist: true  → Tự động loại bỏ các trường không khai báo trong DTO (chặn mass-assignment)
  // forbidNonWhitelisted: true → Trả lỗi 400 nếu client gửi thừa trường
  // transform: true  → Tự động ép kiểu dữ liệu (string → number, v.v.) theo khai báo DTO
  app.useGlobalPipes(
    new StripEmptyStringsPipe(),
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ── EXCEPTION FILTER TOÀN CỤC ──
  // Phải đăng ký trước Interceptor để filter có thể bắt lỗi đúng thứ tự
  app.useGlobalFilters(new GlobalExceptionFilter());

  // ── RESPONSE INTERCEPTOR TOÀN CỤC ──
  // Bọc mọi response thành công vào chuẩn { status, message, data }
  app.useGlobalInterceptors(new TransformInterceptor());

  // ── SWAGGER UI ──
  const swaggerConfig = new DocumentBuilder()
    .setTitle('SH-GROUP ERP API')
    .setDescription('API Quản trị Doanh nghiệp Tổng thể (ERP/WMS/TMS/SCM)')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Nhập JWT token từ /auth/login',
      },
      'bearer',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Backend đang chạy tại: http://0.0.0.0:${port}`);
  console.log(`📖 Swagger UI: http://localhost:${port}/docs`);
}
bootstrap();
