class apiResponse{
    constructor(statusCode,data,message="succesful"){
        this.statusCode=statusCode;
        this.data=data;
        this.message=message;
        this.success=statusCode<400;
    }
}

export default apiResponse;