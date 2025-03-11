import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import { InsertStudent } from '@shared/schema';
import * as XLSX from 'xlsx';

// Function to extract student data from Excel files using xlsx library
export function extractStudentsFromExcel(fileBuffer: Buffer): InsertStudent[] {
  try {
    // Parse the Excel file using xlsx
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    
    // Check if this is a header-based Excel file (has standard column names)
    const hasStandardHeader = data.length > 0 && (
      'Student Number' in data[0] || 
      'student_number' in data[0] || 
      'Name' in data[0] ||
      'name' in data[0]
    );
    
    if (hasStandardHeader) {
      // For header-based Excel files with standard column names
      return data
        .filter((row: any) => {
          const studentNumber = row['Student Number'] || row['student_number'] || '';
          const name = row['Name'] || row['name'] || '';
          const email = row['Email'] || row['email'] || '';
          
          return studentNumber && name && email;
        })
        .map((row: any) => {
          const studentNumber = (row['Student Number'] || row['student_number'] || '').toString().trim();
          const name = (row['Name'] || row['name'] || '').toString().trim();
          const email = (row['Email'] || row['email'] || '').toString().trim();
          
          return {
            studentNumber,
            name,
            email,
            isRegistered: false
          };
        });
    } else {
      // Position-based format (using column indices from our Excel file format)
      // Get data as array of arrays to access by position
      const dataArray = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      
      // Skip header row if it exists
      const startRow = dataArray.length > 0 && 
                      Array.isArray(dataArray[0]) && 
                      dataArray[0].some(cell => 
                        typeof cell === 'string' && 
                        cell.toLowerCase().includes('student')) ? 1 : 0;
      
      return dataArray
        .slice(startRow)
        .filter((row: any) => {
          // Column B (index 1) for student number and column D (index 3) for email
          if (!Array.isArray(row) || row.length < 4) return false;
          return row[1] && row[3]; // Student number and email must exist
        })
        .map((row: any) => {
          const studentNumber = row[1].toString().trim();
          // For name, use column C (index 2) if available, or column A (index 0) as fallback
          const name = (row[2] || row[0] || '').toString().trim();
          const email = row[3].toString().trim();
          
          return {
            studentNumber,
            name,
            email,
            isRegistered: false
          };
        });
    }
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    return [];
  }
}

// Function to load and process the pre-defined Excel files
export async function importPredefinedExcelFiles(storage: any): Promise<{
  totalImported: number;
  filesProcessed: string[];
}> {
  const excelFiles = [
    'attached_assets/1st year mail IDs.xlsx',
    'attached_assets/to email 2nd slot 1st year email id creation information.xlsx'
  ];
  
  let totalImported = 0;
  const filesProcessed: string[] = [];
  
  for (const filePath of excelFiles) {
    try {
      console.log(`Importing Excel file: ${filePath}`);
      const fileBuffer = await fsPromises.readFile(filePath);
      const students = extractStudentsFromExcel(fileBuffer);
      
      if (students.length > 0) {
        let importedCount = 0;
        
        // Process each student
        for (const student of students) {
          try {
            // Check if student already exists
            const existingStudent = await storage.getStudentByNumber(student.studentNumber);
            if (!existingStudent) {
              await storage.createStudent(student);
              importedCount++;
            }
          } catch (err) {
            console.error(`Error importing student: ${student.studentNumber}`, err);
          }
        }
        
        totalImported += importedCount;
        filesProcessed.push(path.basename(filePath));
        console.log(`Imported ${importedCount} students from ${filePath}`);
      } else {
        console.log(`No valid student data found in ${filePath}`);
      }
    } catch (err) {
      console.error(`Error processing Excel file: ${filePath}`, err);
    }
  }
  
  return { totalImported, filesProcessed };
}
