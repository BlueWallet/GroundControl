import {Entity, PrimaryGeneratedColumn, Column, Index} from "typeorm";

@Entity()
@Index(["token"], { unique: false })
export class PushLog {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    token: string;

    @Column()
    payload: string;

    @Column()
    success: boolean;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP'})
    created: Date;
}
