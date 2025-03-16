

class PayementDist{
    constructor(amount,Id,length){
        this.margin = amount
        this.tripId = Id
        this.tripLength = length
    }
    ditributePayments(ditributionData){
        const ditribution = [
            {
                bankUrl :ditributionData.transport.tid,
                amount: ditributionData.transport.amount*this.tripLength
            },
            {
                bankUrl :ditributionData.house.hid,
                amount: ditributionData.house.amount*this.tripLength
            },
            {
                bankUrl :ditributionData.guide.gid,
                amount: ditributionData.guide.amount*this.tripLength
            }
        ]
        this.margin=this.margin-this.tripLength*(ditributionData.guide.amount+ditributionData.house.amount+ditributionData.transport.amount)
        return {
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

payementDist = new PayementDist(participationAmount,tripId,tripLength)
const result = payementDist.ditributePayments(ditributionData)
console.log(JSON.stringify(result))
