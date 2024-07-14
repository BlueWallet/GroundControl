import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

@Entity()
@Index(["token", "txid"], { unique: true })
@Index(["txid"], { unique: false })
@Index(["created"], { unique: false })
export class TokenToTxid {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  token: string;

  @Column()
  os: string;

  @Column()
  txid: string;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  created: Date;
}
