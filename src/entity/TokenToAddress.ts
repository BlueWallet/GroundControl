import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

@Entity()
@Index(["token", "address"], { unique: true })
@Index(["address"], { unique: false })
export class TokenToAddress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  token: string;

  @Column()
  os: string;

  @Column()
  address: string;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  created: Date;
}
