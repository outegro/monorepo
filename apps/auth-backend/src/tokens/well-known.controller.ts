import { Controller, Get } from "@nestjs/common";
import type { JWK } from "jose";
import { TokensService } from "./tokens.service";

/**
 * Public JWKS endpoint. Subservices fetch this (in-cluster) to verify access-token
 * signatures locally — the private key never leaves auth.
 */
@Controller(".well-known")
export class WellKnownController {
  constructor(private readonly tokens: TokensService) {}

  @Get("jwks.json")
  jwks(): { keys: JWK[] } {
    return this.tokens.jwks();
  }
}
