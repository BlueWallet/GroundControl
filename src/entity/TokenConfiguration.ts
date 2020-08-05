import { Entity, Column, PrimaryGeneratedColumn, Index } from "typeorm";

@Entity()
@Index(["token", "os"], { unique: true })
export class TokenConfiguration {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  token: string;

  @Column()
  os: string;

  @Column({ default: () => true })
  level_all: boolean;

  @Column({ default: () => true })
  level_transactions: boolean;

  @Column({ default: () => true })
  level_news: boolean;

  @Column({ default: () => true })
  level_price: boolean;

  @Column({ default: () => true })
  level_tips: boolean;

  @Column({ default: "en" })
  lang: string;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  created: Date;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  last_online: Date;
}
