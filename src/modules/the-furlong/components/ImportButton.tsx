import { useRef } from 'react'
import { Button } from '@mui/material'
import { Upload } from 'lucide-react'

interface ImportButtonProps {
  onFileSelect: (file: File) => void
  loading?: boolean
}

export function ImportButton({ onFileSelect, loading = false }: ImportButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onFileSelect(file)
      // Reset input so same file can be selected again
      event.target.value = ''
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <Button
        variant="contained"
        startIcon={<Upload size={18} />}
        onClick={handleClick}
        disabled={loading}
        sx={{ textTransform: 'none' }}
      >
        {loading ? 'Importing...' : 'Import'}
      </Button>
    </>
  )
}
