import React from 'react';
import { useStateContext } from "../contexts/ContextProvider";
import Button from "./Button";

const InvoiceInfo = () => {
  const { currentColor } = useStateContext();
  return (
    <div className="border-2 rounded-xl w-1/2">
      <h6 className="md:p-2">Company Info(optional): </h6>

      <div className="flex flex-col items-center justify-between">
        <div className="flex flex-col flex-auto md:px-5 md:py-5 gap-2 w-full">
          <div className='flex justify-between items-center'>
            <label> Company Name : </label>
            <input 
            className='border-2 p-2 rounded w-2/3'
            type='text'
            />
          </div>

          <div className='flex justify-between items-center'>
            <label>Company Address:</label>
            <input 
            className='border-2 p-2 rounded w-2/3'
            type='text'
            />

          </div>

          <div className='flex justify-between items-center'>
            <label>EIN:</label>
            <input 
            className='border-2 p-2 rounded w-2/3'
            type='text'
            />

          </div>
        </div>
        <div className="md:mb-5 ">
          <Button
            color="white"
            bgColor={currentColor}
            text="Submit"
            // onClickCallback={handleDeposit}
            borderRadius="10px"
          />
        </div>
      </div>
    </div>
  )
}

export default InvoiceInfo