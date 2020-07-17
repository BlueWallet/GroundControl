import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

@Entity()
export class SendQueue {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: "text",
    comment: "JSON data push notification payload with additional information needed to craft push notification (like address or amount)",
  })
  data: string;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  created: Date;
}
