import { Model, Table, Column } from 'sequelize-typescript';

@Table
export class User extends Model<User> {
  @Column
  name!: string;

  @Column
  email!: string;

  @Column
  password!: string;
}
