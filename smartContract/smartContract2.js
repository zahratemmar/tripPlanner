

class PayementDist{
    constructor(amount,Id,length,spots){
        this.margin = amount
        this.tripId = Id
        this.tripLength = length
        this.spots = spots
    }
    ditributePayments(ditributionData){
        const ditribution = [//calculating and pushing the amounts to be payed linked with the bankURL
            {
                bankUrl :ditributionData.transport.tid,
                amount: ditributionData.transport.amount*this.tripLength*this.spots
            },
            {
                bankUrl :ditributionData.house.hid,
                amount: ditributionData.house.amount*this.tripLength*this.spots
            },
            {
                bankUrl :ditributionData.guide.gid,
                amount: ditributionData.guide.amount*this.tripLength*this.spots
            }
        ]
        this.margin=this.margin-this.tripLength*(ditributionData.guide.amount+ditributionData.house.amount+ditributionData.transport.amount)
        return {//returning the ditribution for the api
            tripId : this.tripId,
            ditribution,
            margin : this.margin
        }
        }
    }







const ditributionData = {
    transport : {
        tid : process.argv[5],
        amount : parseInt(process.argv[6],10)
    },
    house : {
        hid : process.argv[7],
        amount : parseInt(process.argv[8] ,10)
    },
    guide : {
        gid : process.argv[9],
        amount : parseInt(process.argv[10] ,10)
    },
}
const tripId = process.argv[2]
const participationAmount = parseInt(process.argv[3] ,10)
const tripLength = parseInt(process.argv[4],10)
const spots = parseInt(process.argv[11],10)
payementDist = new PayementDist(participationAmount,tripId,tripLength,spots)
const result = payementDist.ditributePayments(ditributionData)
console.log(JSON.stringify(result))
