const rp = require('request-promise');

  
  
  
  const url = 'http://localhost:3001/addParticipation'
    const registerOption ={
        uri : url,
        method : 'POST',
        body : {
            participationData : {
                participator: "id",
                tripId : "a8f50a00-64ac-4501-98ba-b2088772hb223"
            }
            
        },
        json : true
   };
   return rp(registerOption);
