/*
 * Copyright 2023 Alexander Kiriliuk
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

import { Logger, MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ProfileController } from "./controllers/profile.controller";
import { AuthController } from "./controllers/auth.controller";
import { CaptchaController } from "./controllers/captcha.controller";
import { MulterModule } from "@nestjs/platform-express";
import { ExplorerController } from "./controllers/explorer.controller";
import { MediaController } from "./controllers/media.controller";
import { FileController } from "./controllers/file.controller";
import { ConfigController } from "./controllers/config.controller";
import { MulterConfig } from "./multer.config";
import { XmlDataBridgeController } from "./controllers/xml-data-bridge.controller";
import { Orm } from "./orm.config";
import { AppController } from "./controllers/app.controller";
import { WebAppService } from "./web-app.service";
import { ProcessController } from "./controllers/process.controller";
import { HttpModule, HttpService } from "@nestjs/axios";
import {
  AuthModule,
  CacheModule,
  CacheService,
  CaptchaModule,
  CategoryModule,
  ConfigModule,
  Explorer,
  ExplorerModule,
  FileModule,
  GoogleCaptchaService,
  GraphicCaptchaService,
  LocaleSubscriber,
  LOGGER,
  LogModule,
  MediaModule,
  ProcessModule,
  TmpDirCleanerProcess,
  UserEntityPwdAndRolesSaveHandler,
  UserModule,
  XmlDataBridgeMiddleware,
  XmlDataBridgeModule
} from "@k-platform/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ServeStaticModule, ServeStaticModuleOptions } from "@nestjs/serve-static";
import { CaptchaConfig } from "@gen-src/captcha.config";
import { KpConfig } from "@gen-src/kp.config";
import ENTITY_SAVE_HANDLER = Explorer.ENTITY_SAVE_HANDLER;

@Module({
  imports: [
    CacheModule,
    LogModule,
    ConfigModule,
    CategoryModule,
    ProcessModule,
    AuthModule.forRoot(),
    FileModule.forRoot(),
    MediaModule.forRoot(),
    CaptchaModule.forRootAsync({
      imports: [CacheModule, LogModule, HttpModule],
      inject: [CacheService, LOGGER, HttpService],
      useFactory: async (
        cs: CacheService,
        logger: Logger,
        httpService: HttpService
      ) => {
        const type = await cs.get(CaptchaConfig.TYPE);
        if (type === "google") {
          logger.log("Set google recaptcha as captcha service");
          return new GoogleCaptchaService(logger, cs, httpService);
        }
        logger.log("Set default captcha service");
        return new GraphicCaptchaService(logger, cs);
      }
    }),
    UserModule.forRoot(),
    ExplorerModule.forRoot(),
    XmlDataBridgeModule.forRoot(),
    TypeOrmModule.forRootAsync(Orm.getOptions()),
    MulterModule.registerAsync({ useClass: MulterConfig }),
    ServeStaticModule.forRootAsync({
      imports: [CacheModule],
      inject: [CacheService],
      useFactory: async (
        cs: CacheService
      ): Promise<ServeStaticModuleOptions[]> => {
        return [
          {
            rootPath: process.cwd() + (await cs.get(KpConfig.STATIC_FILES))
          }
        ];
      }
    })
  ],
  controllers: [
    AppController,
    AuthController,
    CaptchaController,
    ProfileController,
    ExplorerController,
    MediaController,
    FileController,
    ConfigController,
    XmlDataBridgeController,
    ProcessController
  ],
  providers: [
    LocaleSubscriber,
    WebAppService,
    UserEntityPwdAndRolesSaveHandler,
    TmpDirCleanerProcess,
    {
      provide: ENTITY_SAVE_HANDLER,
      useFactory: (h1: UserEntityPwdAndRolesSaveHandler) => [h1],
      inject: [UserEntityPwdAndRolesSaveHandler]
    }
  ]
})
export class WebAppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(XmlDataBridgeMiddleware).forRoutes(XmlDataBridgeController);
  }
}
