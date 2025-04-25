

export async function newTrip(trip){

    return {
        subject : " new trip in your schedule ! ",
        text: "this trip will take place at "+trip.location+" starts on"+new Date(trip.startDate)+" and ends on "+new Date(trip.endDate)+"\nplease check your account for more details",
        bold : "buckle up ! , you have been matched with other service providers to manage a new trip "
    }
}