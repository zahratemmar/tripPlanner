
export async function participation(trip){

    return {
        subject : " new trip reservation ! ",
        text: "your payment has been processed and your reservation is done your trip will take place at "+trip.location+" starts on"+new Date(trip.startDate)+" and ends on "+new Date(trip.endDate)+"\nplease check your account for more details",
        bold : "buckle up , a new adventure is waiting for you ! "
    }
}