import { IsInt, IsString, Min } from "class-validator";

export class CreateHelloDto {
  @IsString()
  name!: string;

  @IsInt()
  @Min(0)
  age!: number;
}
