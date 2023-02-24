import { Model, Table, Column } from 'sequelize-typescript';

@Table
export class Checkout extends Model<Checkout> {
  @Column
  name!: string;

  @Column
  email!: string;

  @Column
  password!: string;
}
