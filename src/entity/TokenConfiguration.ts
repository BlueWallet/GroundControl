import { Entity, Column, PrimaryGeneratedColumn, Index } from "typeorm";
import { PUSH_IDENTITY_MAX_LENGTH } from "../push-identity";

@Entity()
@Index(["token", "os"], { unique: true })
export class TokenConfiguration {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: PUSH_IDENTITY_MAX_LENGTH })
  token: string;

  @Column({ length: PUSH_IDENTITY_MAX_LENGTH })
  os: string;

  @Column({ default: true })
  level_all: boolean;

  @Column({ default: true })
  level_transactions: boolean;

  @Column({ default: true })
  level_news: boolean;

  @Column({ default: true })
  level_price: boolean;

  @Column({ default: true })
  level_tips: boolean;

  @Column({ default: false })
  redacted: boolean;

  @Column({ default: "en" })
  lang: string;

  @Column({ default: "" })
  app_version: string;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  created: Date;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  last_online: Date;
}
