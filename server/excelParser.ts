import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import { InsertStudent } from '@shared/schema';
import * as XLSX from 'xlsx';

// Function to extract student data from Excel files using xlsx library
export function extractStudentsFromExcel(fileBuffer: Buffer, filePath?: string): InsertStudent[] {
  try {
    // Parse the Excel file using xlsx
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Debug info to understand file structure
    if (filePath) {
      console.log(`Processing Excel file: ${filePath}`);
      console.log(`Sheet name: ${firstSheetName}`);
    }
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });
    
    // If file is empty or couldn't be parsed properly
    if (!data || data.length === 0) {
      // Try with header: 1 to get row-based data
      const rowData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false });
      if (rowData && rowData.length > 0) {
        console.log(`Using row-based parsing for file: ${filePath || 'unknown'}`);
        console.log(`First few rows:`, rowData.slice(0, 2));
        
        // Process row data
        return processRowBasedData(rowData);
      }
      return [];
    }
    
    // Check and log the structure of the first row for debugging
    if (filePath && data.length > 0) {
      console.log(`First row keys in ${filePath}:`, Object.keys(data[0]));
    }
    
    // Special handling for "2nd slot" file which has a different format
    if (filePath && filePath.includes("2nd slot")) {
      console.log("Using special format for 2nd slot file");
      return processSecondSlotFile(data);
    }
    
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
      const dataArray = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false });
      
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

// Special function to process the "2nd slot" file which has a different structure
function processSecondSlotFile(data: any[]): InsertStudent[] {
  // Look for columns with student number and email
  const students: InsertStudent[] = [];
  
  for (const row of data) {
    // Try different potential column names
    let studentNumber = '';
    let name = '';
    let email = '';
    
    // Check various columns that might have student number
    const keys = Object.keys(row);
    
    // Look for ID/Roll No/Student Number column
    for (const key of keys) {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('id') || lowerKey.includes('roll') || lowerKey.includes('student number')) {
        studentNumber = row[key]?.toString().trim() || '';
      }
      else if (lowerKey.includes('name')) {
        name = row[key]?.toString().trim() || '';
      }
      else if (lowerKey.includes('email') || lowerKey.includes('mail')) {
        email = row[key]?.toString().trim() || '';
      }
    }
    
    // If we can't find structured columns, try to use positional approach
    if (!studentNumber || !email) {
      // Try position-based approach (keys might be numbered)
      const values = Object.values(row);
      
      // Look for something that looks like a student number (assuming it's numeric)
      for (let i = 0; i < values.length; i++) {
        const val = values[i]?.toString().trim() || '';
        if (val && /^\d{6,}$/.test(val.replace(/\D/g, ''))) {
          studentNumber = val;
          
          // Look for adjacent email (typically near the ID)
          for (let j = Math.max(0, i-1); j < Math.min(values.length, i+3); j++) {
            const potentialEmail = values[j]?.toString().trim() || '';
            if (potentialEmail && potentialEmail.includes('@')) {
              email = potentialEmail;
              break;
            }
          }
          
          // Look for adjacent name
          for (let j = Math.max(0, i-1); j < Math.min(values.length, i+3); j++) {
            const potentialName = values[j]?.toString().trim() || '';
            if (potentialName && potentialName !== studentNumber && potentialName !== email && 
                !potentialName.includes('@') && isNaN(Number(potentialName))) {
              name = potentialName;
              break;
            }
          }
          
          break;
        }
        
        // Look for email format
        if (val && val.includes('@')) {
          email = val;
        }
      }
    }
    
    // Only add if we found both student number and email
    if (studentNumber && email) {
      // If name is still missing, use part of email as name
      if (!name && email.includes('@')) {
        name = email.split('@')[0];
      }
      
      students.push({
        studentNumber,
        name,
        email,
        isRegistered: false
      });
    }
  }
  
  return students;
}

// Process row-based data (where header:1 is used)
function processRowBasedData(rows: any[]): InsertStudent[] {
  const students: InsertStudent[] = [];
  
  // Skip the first row if it looks like a header
  const startRow = rows.length > 0 && 
                   Array.isArray(rows[0]) && 
                   rows[0].some((cell: any) => 
                     typeof cell === 'string' && 
                     (cell.toLowerCase().includes('student') || 
                      cell.toLowerCase().includes('email') || 
                      cell.toLowerCase().includes('id'))) ? 1 : 0;
  
  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i];
    if (!Array.isArray(row) || row.length < 2) continue;
    
    let studentNumber = '';
    let name = '';
    let email = '';
    
    // Look for the student number and email in the row
    for (let j = 0; j < row.length; j++) {
      const value = row[j]?.toString().trim() || '';
      
      // Look for student number (numeric ID)
      if (!studentNumber && /^\d{6,}$/.test(value.replace(/\D/g, ''))) {
        studentNumber = value;
      }
      // Look for email
      else if (!email && value.includes('@')) {
        email = value;
      }
      // For name, look for string that's not a number or email
      else if (!name && value && !value.includes('@') && isNaN(Number(value))) {
        name = value;
      }
    }
    
    // If we have both student number and email
    if (studentNumber && email) {
      // If name is still missing, use part of email as name
      if (!name && email.includes('@')) {
        name = email.split('@')[0];
      }
      
      students.push({
        studentNumber,
        name,
        email,
        isRegistered: false
      });
    }
  }
  
  return students;
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
      const students = extractStudentsFromExcel(fileBuffer, filePath);
      
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
