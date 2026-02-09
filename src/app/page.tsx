'use client';

import Image from 'next/image';
import { redirect, RedirectType } from 'next/navigation';

import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import Alert from '@mui/material/Alert';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField, { TextFieldProps } from '@mui/material/TextField';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { useForm } from 'react-hook-form';

import { S3Config, useS3Config } from '@/context/s3config';

type FormField = { fieldName: keyof S3Config } & Pick<TextFieldProps, 'label' | 'placeholder'>;

const formFields: FormField[] = [
  {
    fieldName: 'accessKeyID',
    label: 'Access Key ID',
  },
  {
    fieldName: 'secretAccessKey',
    label: 'Secret Access Key',
  },
  {
    fieldName: 'bucketName',
    label: 'Bucket Name',
  },
  {
    fieldName: 'region',
    label: 'Region',
  },
];

const Home: React.FC = () => {
  const { config, setConfig } = useS3Config();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<S3Config>();

  const onSubmit = async (formValue: S3Config): Promise<void> => {
    try {
      const s3Client = new S3Client({
        region: formValue.region,
        credentials: {
          accessKeyId: formValue.accessKeyID,
          secretAccessKey: formValue.secretAccessKey,
        },
      });
      const command = new HeadBucketCommand({ Bucket: formValue.bucketName });

      await s3Client.send(command);

      setConfig(formValue);
    } catch {
      setError('root', {
        type: 'invalidConfig',
        message:
          'Failed to connect to the S3 bucket. Please check your credentials and bucket name.',
      });
    }
  };

  if (config) {
    redirect('/app', RedirectType.replace);
  }

  return (
    <>
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ top: 0 }}>
        <Toolbar>
          <div className="flex items-center gap-2">
            <Image src="/music-robot-96.png" alt="bitvolt" width={48} height={48} />
            <Typography variant="h5" component="h2" fontWeight="bold">
              bitvolt
            </Typography>
          </div>
        </Toolbar>
      </AppBar>

      <Box
        component="main"
        className="w-md max-w-full mx-auto mt-24 px-6 py-8 rounded-lg border flex flex-col gap-4"
        sx={theme => ({ borderColor: theme.palette.divider })}
      >
        <Typography variant="h6" fontWeight="bold">
          Amazon S3 Configuration
        </Typography>

        <form className="flex flex-col gap-6" onSubmit={handleSubmit(onSubmit)}>
          {formFields.map(formField => (
            <TextField
              key={formField.fieldName}
              variant="outlined"
              size="small"
              fullWidth
              label={formField.label}
              placeholder={formField.placeholder}
              autoComplete="off"
              required
              {...register(formField.fieldName, {
                required: `${formField.placeholder ?? formField.fieldName} is required`,
              })}
              error={!!errors[formField.fieldName]}
              helperText={errors[formField.fieldName]?.message}
            />
          ))}
          <Button variant="contained" disableElevation type="submit">
            Submit
          </Button>
        </form>

        {errors.root && (
          <Alert severity="error" sx={{ alignItems: 'center' }}>
            {errors.root.message}
          </Alert>
        )}

        <Typography variant="caption" component="div" textAlign="center">
          The information is stored locally in your browser.
        </Typography>
      </Box>
    </>
  );
};

export default Home;
