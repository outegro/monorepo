import { Module } from "@nestjs/common";
import { KakaoModule } from "../kakao/kakao.module";
import { PlacesModule } from "../places/places.module";
import { ReelsController } from "./reels.controller";
import { ReelsService } from "./reels.service";

@Module({
  imports: [KakaoModule, PlacesModule],
  controllers: [ReelsController],
  providers: [ReelsService],
})
export class ReelsModule {}
