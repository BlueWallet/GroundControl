import { Entity, PrimaryGeneratedColumn, Column, Index, PrimaryColumn } from "typeorm";

@Entity()
export class KeyValue {
  @Column({ primary: true })
  key: string;

  @Column("text")
  value: string;
}
