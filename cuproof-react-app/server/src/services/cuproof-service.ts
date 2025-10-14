import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

const execAsync = promisify(exec);

export interface CuproofCLIResult {
  success: boolean;
  proof?: string;
  error?: string;
  output?: string;
}

export class CuproofService {
  private cuproofPath: string;
  private paramsPath: string;

  constructor() {
    // Path to the compiled cuproof executable
    // Cuproof CLI is located in the main cuproof directory
    const basePath = path.join(__dirname, '..', '..', '..', '..');
    
    this.cuproofPath = path.join(basePath, 'target', 'release', 'cuproof.exe');
    this.paramsPath = path.join(basePath, 'params.txt');
    
    console.log('CuproofService initialized:');
    console.log('  Base path:', basePath);
    console.log('  Cuproof path:', this.cuproofPath);
    console.log('  Params path:', this.paramsPath);
  }

  /**
   * Get the base path for file operations
   */
  private getBasePath(): string {
    return path.join(__dirname, '..', '..', '..', '..');
  }

  /**
   * Generate proof using Cuproof CLI
   */
  async generateProof(value: number, rangeMin: number, rangeMax: number): Promise<CuproofCLIResult> {
    try {
      // Convert values to hex
      const valueHex = value.toString(16);
      const rangeMinHex = rangeMin.toString(16);
      const rangeMaxHex = rangeMax.toString(16);

      // Generate proof using cuproof CLI
      const command = `"${this.cuproofPath}" prove "${this.paramsPath}" ${rangeMinHex} ${rangeMaxHex} ${valueHex} proof.txt`;
      
      console.log('Executing command:', command);
      
      const basePath = this.getBasePath();
      const { stdout, stderr } = await execAsync(command, {
        cwd: basePath,
        timeout: 30000 // 30 seconds timeout
      });

      if (stderr && stderr.includes('error')) {
        return {
          success: false,
          error: stderr,
          output: stdout
        };
      }

      // Read the generated proof file
      const proofPath = path.join(basePath, 'proof.txt');
      let proofContent = '';
      
      if (fs.existsSync(proofPath)) {
        proofContent = fs.readFileSync(proofPath, 'utf8');
      }

      return {
        success: true,
        proof: proofContent,
        output: stdout
      };

    } catch (error: any) {
      console.error('Cuproof CLI error:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
        output: error.stdout || ''
      };
    }
  }

  /**
   * Verify proof using Cuproof CLI
   */
  async verifyProof(proofContent: string): Promise<CuproofCLIResult> {
    try {
      // Write proof to temporary file
      const basePath = this.getBasePath();
      const tempProofPath = path.join(basePath, 'temp_proof.txt');
      fs.writeFileSync(tempProofPath, proofContent);

      // Verify proof using cuproof CLI
      const command = `"${this.cuproofPath}" verify "${this.paramsPath}" "${tempProofPath}"`;
      
      console.log('Executing verification command:', command);
      
      const { stdout, stderr } = await execAsync(command, {
        cwd: basePath,
        timeout: 30000 // 30 seconds timeout
      });

      // Parse result strictly by exact lines to avoid INVALID matching VALID
      const lines = stdout.trim().split(/\r?\n/).map(l => l.trim().toUpperCase());
      const hasValid = lines.includes('VALID');
      const hasInvalid = lines.includes('INVALID');
      const isValid = hasValid && !hasInvalid;
      
      return {
        success: isValid,
        output: stdout,
        error: isValid ? undefined : (stderr || 'Verification failed')
      };
    } catch (error: any) {
      console.error('Cuproof verification error:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
        output: error.stdout || ''
      };
    } finally {
      // Ensure temp file cleanup even on error
      try {
        const basePath = this.getBasePath();
        const tempProofPath = path.join(basePath, 'temp_proof.txt');
        if (fs.existsSync(tempProofPath)) {
          fs.unlinkSync(tempProofPath);
        }
      } catch {}
    }
  }

  /**
   * Setup Cuproof parameters
   */
  async setupParameters(mode: 'fast' | 'trusted' = 'fast'): Promise<CuproofCLIResult> {
    try {
      const command = `"${this.cuproofPath}" setup ${mode} "${this.paramsPath}"`;
      
      console.log('Executing setup command:', command);
      
      const basePath = this.getBasePath();
      const { stdout, stderr } = await execAsync(command, {
        cwd: basePath,
        timeout: 60000 // 60 seconds timeout for setup
      });

      const success = !stderr || !stderr.includes('error');
      
      return {
        success,
        output: stdout,
        error: success ? undefined : stderr
      };

    } catch (error: any) {
      console.error('Cuproof setup error:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
        output: error.stdout || ''
      };
    }
  }

  /**
   * Check if Cuproof CLI is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const command = `"${this.cuproofPath}" --version`;
      await execAsync(command, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get proof hash from proof content
   */
  getProofHash(proofContent: string): string {
    return crypto.createHash('sha256').update(proofContent).digest('hex');
  }
}
