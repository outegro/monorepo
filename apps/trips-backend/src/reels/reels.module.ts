import { Module } from "@nestjs/common";
import { KakaoModule } from "../kakao/kakao.module";
import { PlacesModule } from "../places/places.module";
import { ReelMetaService } from "./reel-meta.service";
import { ReelsController } from "./reels.controller";
import { ReelsService } from "./reels.service";

@Module({
  imports: [KakaoModule, PlacesModule],
  controllers: [ReelsController],
  providers: [ReelsService, ReelMetaService],
})
export class ReelsModule {}
