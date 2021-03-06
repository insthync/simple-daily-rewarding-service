import { PrismaClient } from '@prisma/client'
import { DateTime } from 'luxon';
import { IClaimableRewards } from '../interfaces'

export default {
    isAnyClaimedWithinDate: function(entries : any[], currentDate : DateTime, testDate : DateTime) : boolean {
        const startOfCurrentDate = currentDate.startOf('day')
        const endOfCurrentDate = currentDate.endOf('day')
        for (let j = 0; j < entries.length; j++) {
            if (entries[j].createdAt.getTime() >= startOfCurrentDate.toJSDate().getTime() &&
                entries[j].createdAt.getTime() <= endOfCurrentDate.toJSDate().getTime() &&
                entries[j].createdAt.getTime() >= testDate.toJSDate().getTime() &&
                entries[j].createdAt.getTime() <= testDate.plus({days:1}).toJSDate().getTime())
            {
                return true;
            }
        }
        return false;
    },
    getClaimableRewards: async function(prisma : PrismaClient, currentDate : DateTime, cycleStart : DateTime, cycleEnd : DateTime, rewards : any[], consecutive : boolean, earnerId : string) : Promise<IClaimableRewards[]> {
        const startOfCurrentDate = currentDate.startOf('day')
        const entries = await prisma.givenRewards.findMany({
            where: {
                earnerId: earnerId,
                createdAt: {
                    gte: cycleStart.toJSDate(),
                    lte: cycleEnd.toJSDate()
                }
            },
            orderBy: [{
                createdAt: 'asc'
            }]
        })
        const count = entries.length
        const result : IClaimableRewards[] = []
        let claimableDate = cycleStart
        let foundClaimableEntry = false
        for (let i = 0; i < rewards.length; i++) {
            const reward = rewards[i]
            let isClaimed = false
            if (!consecutive) {
                isClaimed = this.isAnyClaimedWithinDate(entries, currentDate, claimableDate);
            } else {
                isClaimed = i < count
            }
            let canClaim = false
            if (!isClaimed) {
                if (count > 0) {
                    canClaim = entries[entries.length - 1].createdAt.getTime() < startOfCurrentDate.toJSDate().getTime()
                } else {
                    canClaim = true
                }
                if (!consecutive) {
                    canClaim = canClaim && currentDate.toJSDate().getTime() >= claimableDate.toJSDate().getTime()
                    canClaim = canClaim && currentDate.toJSDate().getTime() <= claimableDate.plus({days:1}).toJSDate().getTime()
                } else {
                    canClaim = canClaim && !foundClaimableEntry
                }
                if (!foundClaimableEntry) {
                    foundClaimableEntry = canClaim
                }
            }
            result.push({
                isClaimed: isClaimed,
                canClaim: canClaim,
                reward: reward
            })
            claimableDate = claimableDate.plus({days:1})
        }
        return result
    }
}