import { expect } from "chai";
import { network } from "hardhat";

interface Question {
  question: string;
  options: string[];
}

it("Survey init", async () => {
  const { ethers } = await network.connect();

  const title = "막무가내 설문조사";
  const description = "머시기기기기";
  const questions: Question[] = [
    {
      question: "카카ㅏㅋ",
      options: ["카ㅏ캌"],
    },
  ];

  // const surveys = await factory.getSurveys();
  const factory = await ethers.deployContract("SurveyFactory", [
    ethers.parseEther("50"),
    ethers.parseEther("0.1"),
  ]);
  const tx = await factory.createSurvey(
    {
      title,
      description,
      targetNumber: 100,
      questions,
    },
    {
      value: ethers.parseEther("100"),
    },
  );

  const receipt = await tx.wait();
  let surveyAddress;
  receipt?.logs.forEach((log) => {
    const event = factory.interface.parseLog(log);
    if (event?.name == "SurveyCreated") {
      surveyAddress = event.args[0];
    }
  });

  const surveyC = ethers.getContractFactory("Survey");
  const signers = await ethers.getSigners();
  const respondent = signers[0];
  if (surveyAddress) {
    const survey = (await surveyC).attach(surveyAddress);
    await survey.connect(respondent);
    console.log(
      ethers.formatEther(await ethers.provider.getBalance(respondent)),
    );
    const submitTx = await survey.submitAnswer({
      respondent,
      answers: [1],
    });
    await submitTx.wait();
    console.log(
      ethers.formatEther(await ethers.provider.getBalance(respondent)),
    );
  }
});

describe("SurveyFactory Contract", () => {
  let factory, owner, respondent1, respondent2;

  beforeEach(async () => {
    const { ethers } = await network.connect();

    [owner, respondent1, respondent2] = await ethers.getSigners();

    factory = await ethers.deployContract("SurveyFactory", [
      ethers.parseEther("50"), // min_pool_amount

      ethers.parseEther("0.1"), // min_reward_amount
    ]);
  });

  it("should deploy with correct minimum amounts", async () => {
    const { ethers } = await network.connect();
    const minPool = await factory.min_pool_amount();
    const minReward = await factory.min_reward_amount();

    expect(minPool).to.equal(ethers.parseEther("50"));
    expect(minReward).to.equal(ethers.parseEther("0.1"));
  });

  it("should create a new survey when valid values are provided", async () => {
    const { ethers } = await network.connect();
    const schema = {
      title: "Test Survey",
      description: "Desc",
      targetNumber: 100, // 50 ETH / 100 = 0.5 ETH >= 0.1 ETH
      questions: [{ question: "Q1", options: ["A", "B"] }],
    };

    const value = await factory.min_pool_amount();

    await expect(factory.createSurvey(schema, { value })).to.emit(
      factory,
      "SurveyCreated",
    );

    const surveys = await factory.getSurveys();
    expect(surveys.length).to.equal(1);
  });

  it("should revert if pool amount is too small", async () => {
    const { ethers } = await network.connect();
    const schema = {
      title: "Too Small Pool",
      description: "Desc",
      targetNumber: 100,
      questions: [{ question: "Q1", options: ["A", "B"] }],
    };

    const tooSmall = (await factory.min_pool_amount()) - 1n;

    await expect(
      factory.createSurvey(schema, { value: tooSmall }),
    ).to.be.revertedWith("Insufficient pool amount");
  });

  it("should revert if reward amount per respondent is too small", async () => {
    const { ethers } = await network.connect();
    const minPool = await factory.min_pool_amount();
    const minReward = await factory.min_reward_amount();

    // targetNumber을 크게 해서 (minPool / targetNumber) < minReward 만들기
    const targetNumber = Number(minPool / minReward) + 1; // 딱 기준보다 1 크게

    const schema = {
      title: "Too Small Reward",
      description: "Desc",
      targetNumber,
      questions: [{ question: "Q1", options: ["A", "B"] }],
    };

    await expect(
      factory.createSurvey(schema, { value: minPool }),
    ).to.be.revertedWith("Insufficient reward amount");
  });

  it("should store created surveys and return them from getSurveys", async () => {
    const { ethers } = await network.connect();
    const schema1 = {
      title: "S1",
      description: "D1",
      targetNumber: 100,
      questions: [{ question: "Q1", options: ["A", "B"] }],
    };
    const schema2 = {
      title: "S2",
      description: "D2",
      targetNumber: 100,
      questions: [{ question: "Q2", options: ["X", "Y"] }],
    };

    const value = await factory.min_pool_amount();

    await factory.createSurvey(schema1, { value });
    await factory.createSurvey(schema2, { value });

    const surveys = await factory.getSurveys();
    expect(surveys.length).to.equal(2);
    expect(surveys[0]).to.properAddress;
    expect(surveys[1]).to.properAddress;
    expect(surveys[0].toLowerCase()).to.not.equal(surveys[1].toLowerCase());
  });
});
