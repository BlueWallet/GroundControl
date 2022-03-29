import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

@Entity()
@Index(["token", "hash"], { unique: true })
@Index(["hash"], { unique: false })
export class TokenToHash {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  token: string;

  @Column()
  os: string;

  @Column()
  hash: string;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  created: Date;
}
