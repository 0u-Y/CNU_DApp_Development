import { expect } from "chai";
import { network } from "hardhat";

interface Question {
  question: string;
  options: string[];
}

// 중간고사 대체 과제 Test code
describe("Survey init", () => {
  const title = "막무가내 설문조사라면";

  const description =
    "중앙화된 설문조사로서, 모든 데이터는 공개되지 않으며 설문조사를 게시한자만 볼 수 있습니다.";

  const questions: Question[] = [
    {
      question: "누가 내 응답을 관리할때 더 솔직할 수 있을까요?",

      options: [
        "구글폼 운영자",

        "탈중앙화된 블록체인 (관리주체 없으며 모든 데이터 공개)",

        "상관없음",
      ],
    },
  ];

  const getSurveyContractAndEthers = async (survey: {
    title: string;

    description: string;

    targetNumber: number;

    questions: Question[];
  }) => {
    const { ethers } = await network.connect();

    const cSurvey = await ethers.deployContract("Survey", [
      survey.title,

      survey.description,

      survey.targetNumber,

      survey.questions,
    ]);

    return { ethers, cSurvey };
  };

  describe("Deployment", () => {
    it("should store survey info correctly", async () => {
      const targetNumber = 3;

      const { cSurvey } = await getSurveyContractAndEthers({
        title,
        description,
        targetNumber,
        questions,
      });

      expect(await cSurvey.title()).to.equal(title);
      expect(await cSurvey.description()).to.equal(description);
      expect(await cSurvey.targetNumber()).to.equal(targetNumber);

      const onchainQuestions = await cSurvey.getQuestions();
      expect(onchainQuestions.length).to.equal(questions.length);
      expect(onchainQuestions[0].question).to.equal(questions[0].question);
      expect(onchainQuestions[0].options).to.deep.equal(questions[0].options);
    });

    it("should calculate rewardAmount correctly", async () => {
      const { ethers } = await network.connect();
      const targetNumber = 4;
      const value = ethers.parseEther("2");

      const survey = await ethers.getContractFactory("Survey");
      const cSurvey = await survey.deploy(
        title,
        description,
        targetNumber,
        questions,
        { value },
      );

      await cSurvey.waitForDeployment();
      const rewardAmount = await cSurvey.rewardAmount();

      expect(rewardAmount).to.equal(value / BigInt(targetNumber));
    });
  });

  describe("Questions and Answers", () => {
    it("should return questions correctly", async () => {
      const targetNumber = 5;
      const { cSurvey } = await getSurveyContractAndEthers({
        title,
        description,
        targetNumber,
        questions,
      });

      const allQuestions = await cSurvey.getQuestions();
      expect(allQuestions.length).to.equal(1);
      expect(allQuestions[0].question).to.equal(questions[0].question);
      expect(allQuestions[0].options).to.deep.equal(questions[0].options);
    });

    it("should allow valid answer submission", async () => {
      const { ethers, cSurvey } = await getSurveyContractAndEthers({
        title,
        description,
        targetNumber: 2,
        questions,
      });

      const [, user] = await ethers.getSigners();

      const answer = {
        respondent: user.address,
        answers: [1],
      };

      await cSurvey.connect(user).submitAnswer(answer);

      const storedAnswers = await cSurvey.getAnswers();
      expect(storedAnswers.length).to.equal(1);
      expect(storedAnswers[0].respondent).to.equal(answer.respondent);
      expect(storedAnswers[0].answers).to.deep.equal(answer.answers);
    });

    it("should revert if answer length mismatch", async () => {
      const { ethers, cSurvey } = await getSurveyContractAndEthers({
        title,
        description,
        targetNumber: 2,
        questions,
      });

      const [, user] = await ethers.getSigners();

      const wrong = {
        respondent: user.address,
        answers: [0, 1], // 질문이 1개지만 2개 답변
      };

      await expect(
        cSurvey.connect(user).submitAnswer(wrong),
      ).to.be.revertedWith("Mismatched answers length");
    });

    it("should revert if target reached", async () => {
      const { ethers, cSurvey } = await getSurveyContractAndEthers({
        title,
        description,
        targetNumber: 2,
        questions,
      });

      const [, user1, user2, user3] = await ethers.getSigners();

      await cSurvey
        .connect(user1)
        .submitAnswer({ respondent: user1.address, answers: [0] });
      await cSurvey
        .connect(user2)
        .submitAnswer({ respondent: user2.address, answers: [1] });

      expect((await cSurvey.getAnswers()).length).to.equal(2);

      //3번째 응답 거절
      await expect(
        cSurvey
          .connect(user3)
          .submitAnswer({ respondent: user3.address, answers: [2] }),
      ).to.be.revertedWith("This survey has been ended");
    });
  });

  describe("Rewards", () => {
    it("should pay correct reward to respondent", async () => {
      const { ethers } = await network.connect();
      const targetNumber = 4;
      const value = ethers.parseEther("3");

      const survey = await ethers.getContractFactory("Survey");
      const cSurvey = await survey.deploy(
        title,
        description,
        targetNumber,
        questions,
        { value },
      );

      await cSurvey.waitForDeployment();

      const [, user] = await ethers.getSigners();
      const per = await cSurvey.rewardAmount();
      expect(per).to.equal(value / BigInt(targetNumber));

      const answer = { respondent: user.address, answers: [1] };

      const contractAddr = await cSurvey.getAddress();
      const beforeCtr = await ethers.provider.getBalance(contractAddr);

      await cSurvey.connect(user).submitAnswer(answer);

      const afterCtr = await ethers.provider.getBalance(contractAddr);

      expect(beforeCtr - afterCtr).to.equal(per);
    });
  });
});

// 중간고사 대체 과제 끝

it("Survey init", async () => {
  const { ethers } = await network.connect();

  const title = "막무가내 설문조사라면";
  const description = "중앙화된 설문조사";
  const questions: Question[] = [
    {
      question: "ㅎㅇㅎㅇ",
      options: ["ㅎㅇㅎㅇ"],
    },
  ];

  // const surveys = await factory.getSurveys();
  const survey = await ethers.deployContract(
    "Survey",
    [title, description, 100, questions],
    {
      value: ethers.parseEther("100"),
    },
  );

  const slot0Data = await ethers.provider.getStorage(
    survey.getAddress(),
    ethers.toBeHex(0, 32),
  );
  const slot1Data = await ethers.provider.getStorage(
    survey.getAddress(),
    ethers.toBeHex(1, 32),
  );
  const slot2Data = await ethers.provider.getStorage(
    survey.getAddress(),
    ethers.toBeHex(2, 32),
  );
  const slot3Data = await ethers.provider.getStorage(
    survey.getAddress(),
    ethers.toBeHex(3, 32),
  );
  const slot4Data = await ethers.provider.getStorage(
    survey.getAddress(),
    ethers.toBeHex(4, 32),
  );
  const slot5Data = await ethers.provider.getStorage(
    survey.getAddress(),
    ethers.toBeHex(5, 32),
  );

  console.log(slot0Data);
  console.log(slot1Data);
  console.log(slot2Data);
  console.log(slot3Data);
  console.log(slot4Data);
  console.log(slot5Data);
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
