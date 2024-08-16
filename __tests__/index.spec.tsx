import { generate } from "../index";

describe("generate", () => {
  it("should generate html completely", async () => {
    const result = await generate("http://example.com/top");
    expect(result).toMatchSnapshot();
  });
});
