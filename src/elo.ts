// K Factor
const K = 32;

// Expected Score for a player with rating Ra against a player with rating Rb
const calculateExpectedScore = (Ra: number, Rb: number) =>
	1 / (1 + Math.pow(10, (Rb - Ra) / 400));

// Elo Gain/Loss for a player with rating Ra who scored S points against a player with rating Rb
const calucateRatingDiff = (Ra: number, Rb: number, S: number) =>
	K * (S - calculateExpectedScore(Ra, Rb));

export { calucateRatingDiff };
