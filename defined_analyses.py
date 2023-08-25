import os
import io
import numpy as np
from PIL import Image
from guitarsounds.analysis import Plot, Signal, Sound, SoundPack
import matplotlib.pyplot as plt
import streamlit as st
import scipy.io
from scipy.signal import spectrogram


def plot_with_sound(fun):
    """ Call the analyses with sound as argument """
    def new_fun(sound):
        fun(sound.signal.plot)
    return new_fun

def plot_with_soundpack(fun):
    """ Call the analyses with soundpack as argument """
    def new_fun(soundpack):
        for sound in soundpack.sounds:
            fun(sound.signal.normalize().plot, label=sound.name)
        plt.gca().legend()
    return new_fun

def load_md(md_file):
    with open(md_file) as f:
        content = f.read()
    return content

def streamlit_listen_freq_bins(sound):
    """ 
    listen freq bin function redefined to
    work with the streamlit framework 
    Creates audio elements with names, media player 
    and download button for each frequency bin signal
    in a guitarsounds.Sound instance
    """
    translated_bins = {'bass':'Basses',
                       'mid':'Mids',
                       'highmid':'High-Mids',
                       'uppermid':'Upper-Mids',
                       'presence':'Présence',
                       'brillance':'Brillance'}
    for key in sound.bins:
        c = st.container()
        colname, colaudio, coldownload = c.columns([1, 3.5, 0.5])
        colname.write(translated_bins[key])
        colaudio.audio(sound.bins[key].signal, sample_rate=sound.signal.sr)
        # Define the file content
        bytes_wav = bytes()
        byte_io = io.BytesIO(bytes_wav)
        scipy.io.wavfile.write(byte_io, 
                               sound.bins[key].sr, 
                               sound.bins[key].signal)
        file_bytes = byte_io.read()
        coldownload.download_button(label=':arrow_down:',
                                    data=file_bytes,
                                    file_name=f'{sound.name}_{key}.wav',)

def sound_spectrogram(sound):
    """
    Plots a spectrogram of a single sound
    """
    sig_arr = sound.signal.signal
    sr = sound.signal.sr

    freqs, time, spec = spectrogram(sig_arr, sr, nperseg=1024)
    spec /= np.max(spec)
    thresh = 1e-4
    low_values_idx = spec>thresh
    log_min = np.min(np.log(spec[low_values_idx]))
    spec[low_values_idx]= np.log(spec[low_values_idx])
    spec[~low_values_idx] = log_min

    plt.pcolormesh(time,
                   freqs,
                   spec,
                   shading='gouraud',
                   cmap='inferno')
    plt.colorbar(label='Amplitude (dB)')
    ax = plt.gca()
    ax.set_ylim(1, 1.1*sound.SP.general.fft_range.value)
    ax.set_xlabel('Temps (s)')
    ax.set_ylabel('Fréquence (Hz)')


def spectrogram_diff(soundpack):
	"""
	Plot the difference in the spectrograms of two sounds
	"""
	# Access the sounds and compute log normalized spectrograms
	son1 = soundpack.sounds[0]
	son2 = soundpack.sounds[1]
	fq1, t1, Sp1 = son1.lognormspect()
	fq2, t2, Sp2 = son2.lognormspect()

	# Compute and normalize difference
	Sp_diff = Sp1 - Sp2
	Sp_diff -= np.min(Sp_diff)
	Sp_diff /= np.max(Sp_diff)
	Sp_diff *= 2
	Sp_diff -= 1
	mean_val = np.mean(Sp_diff)
	# Set the mean value in the center of the data range
	# This makes the colormap symmetric
	if mean_val > 0:
		Sp_diff[Sp_diff > 0] -= mean_val
		Sp_diff[Sp_diff > 0] /= (1 - mean_val)
	else:
		Sp_diff[Sp_diff < 0] -= mean_val
		Sp_diff[Sp_diff < 0] /= (1 + mean_val)

	# Plot the result
	plt.pcolormesh(t1,
				   fq1,
				   Sp_diff,
				   shading='gouraud',
				   cmap='RdBu')

	ax = plt.gca()
	ax.set_ylim(1, 1.1*son1.SP.general.fft_range.value)
	ax.set_xlim(0, son1.signal.time()[-1])
	ax.set_xlabel('Temps (s)')
	ax.set_ylabel('Fréquence (Hz)')
	plt.colorbar(label='<- Son 2   :    Son 1 ->')
	ax.set_title('Différence entre deux spectrogrammes')

    
single_sound_analysis_names = {'signal':'Tracer la courbe du son',
                               'envelope':"Tracer l'enveloppe du signal",
                               'logenv':"Tracer l'enveloppe logarithmique du signal",
                               'fft':'Tracer le spectre fréquentiel du son (FFT)',
                               'ffthist':"Tracer l'histogramme du spectre fréquentiel (FFT)",
                               'peaks':"Visualiser les pics du spectre fréquentiel (FFT)",
                               'specgram':"Visualiser le spectrogramme du son",
                               'timedamp':"Tracer l'amortissement temporel",
                               'listenband':"Écouter les bandes de fréquence",
                               'plotband':"Tracer les bandes de fréquence",
                               'histband':"Histogramme des bandes de fréquence"}

single_sound_analysis_functions = {'signal':plot_with_sound(Plot.signal),
                                   'envelope':plot_with_sound(Plot.envelope),
                                   'logenv':plot_with_sound(Plot.log_envelope),
                                   'fft':plot_with_sound(Plot.fft),
                                   'ffthist':plot_with_sound(Plot.fft_hist),
                                   'peaks':plot_with_sound(Plot.peaks),
                                   'specgram':sound_spectrogram,
                                   'timedamp':plot_with_sound(Plot.time_damping),
                                   'listenband':streamlit_listen_freq_bins,
                                   'plotband':Sound.plot_freq_bins,
                                   'histband':Sound.bin_hist}

single_sound_analysis_help = {'signal':load_md(os.path.join('documentation', 'signal.md')),
                              'envelope':load_md(os.path.join('documentation', 'envelope.md')),
                              'logenv':load_md(os.path.join('documentation', 'logenvelope.md')),
                              'fft':load_md(os.path.join('documentation', 'fft.md')),
                              'ffthist':load_md(os.path.join('documentation', 'binfft.md')),
                              'peaks':load_md(os.path.join('documentation', 'peaks.md')),                              
                              'specgram':load_md(os.path.join('documentation', 'specgram.md')),
                              'timedamp':load_md(os.path.join('documentation', 'timedamp.md')), 
                              'listenband':load_md(os.path.join('documentation', 'listenband.md')), 
                              'plotband':load_md(os.path.join('documentation', 'plotband.md')), 
                              'histband':load_md(os.path.join('documentation', 'histband.md'))} 

single_sound_analysis_help_figures = {'signal':Image.open(os.path.join('documentation', 'figures', 'signal.png')),
                                      'envelope':Image.open(os.path.join('documentation', 'figures', 'envelope.png')),
                                      'logenv':Image.open(os.path.join('documentation', 'figures', 'logenv.png')),
                                      'fft':Image.open(os.path.join('documentation', 'figures', 'fft.png')),
                                      'ffthist':Image.open(os.path.join('documentation', 'figures', 'ffthist.png')),
                                      'peaks':Image.open(os.path.join('documentation', 'figures', 'peaks.png')),
                                      'specgram':Image.open(os.path.join('documentation', 'figures', 'specgram.png')),
                                      'timedamp':Image.open(os.path.join('documentation', 'figures', 'timedamp.png')),
                                      'listenband':Image.open(os.path.join('documentation', 'figures', 'listenband.png')),
                                      'plotband':Image.open(os.path.join('documentation', 'figures', 'plotband.png')),
                                      'histband':Image.open(os.path.join('documentation', 'figures', 'histband.png'))}

""" 
Pre-defined analyses for dual soundpacks (n = 2)
"""
dual_sound_analysis_names = {'msignal':'Tracer la courbe des sons',
                             'menvelope':"Tracer l'enveloppe des sons",
                             'mlogenv':"Tracer l'enveloppe logarithmique des sons",
                             'mfft':'Tracer le spectre fréquentiel des sons (FFT)',
                             'mffthist':"Tracer l'histogramme du spectre fréquentiel des sons (FFT)",
                             'fftmirror':'Comparer les spectres fréquentiels en configuration mirroir (FFT)',
                             'fftdiff':'Visualiser la différence entre les spectres fréquentiels (FFT)',
							 'specdiff':'Visualiser la différence entre les spectrogrammes des sons',
                             'peakcomp':'Comparer les pics du spectre fréquentiel (FFT)',
                             'fbinplot':'Tracer les bandes de fréquence',
                             'binhist':'Histogramme des bandes de fréquences',
                             'binpower':'Comparer la puissance des bandes de fréquence'}


dual_sound_analysis_functions = {'msignal':plot_with_soundpack(Plot.signal),
                                 'menvelope':plot_with_soundpack(Plot.envelope),
                                 'mlogenv':plot_with_soundpack(Plot.log_envelope),
                                 'mfft':plot_with_soundpack(Plot.fft),
                                 'mffthist':plot_with_soundpack(Plot.fft_hist),
                                 'peakcomp': SoundPack.compare_peaks,
                                 'fftmirror': SoundPack.fft_mirror,
                                 'fftdiff': SoundPack.fft_diff,
								 'specdiff':spectrogram_diff,
                                 'binpower': SoundPack.integral_plot,
                                 'binhist': SoundPack.bin_power_hist,
                                 'fbinplot': SoundPack.freq_bin_plot,}

dual_sound_analysis_help = {'msignal':load_md(os.path.join('documentation', 'signal.md')),                             
                            'menvelope':load_md(os.path.join('documentation', 'envelope.md')),                             
                            'mlogenv':load_md(os.path.join('documentation', 'logenvelope.md')),
                            'mfft':load_md(os.path.join('documentation', 'fft.md')),
                            'mffthist':load_md(os.path.join('documentation', 'binfft.md')),
                            'peakcomp':load_md(os.path.join('documentation', 'peakcomp.md')),
                            'fftmirror':load_md(os.path.join('documentation', 'fftmirror.md')),
                            'fftdiff':load_md(os.path.join('documentation', 'fftdiff.md')),
							'specdiff':load_md(os.path.join('documentation','specdiff.md')),
                            'binpower':load_md(os.path.join('documentation', 'binpower.md')),
                            'binhist':load_md(os.path.join('documentation', 'histband.md')),
                            'fbinplot':load_md(os.path.join('documentation', 'fbinplot.md')),}

dual_sound_analysis_help_figures = {'msignal':Image.open(os.path.join('documentation', 'figures', 'signal.png')),
                                    'menvelope':Image.open(os.path.join('documentation', 'figures', 'envelope.png')),
                                    'mlogenv':Image.open(os.path.join('documentation', 'figures', 'logenv.png')),
                                    'mfft':Image.open(os.path.join('documentation', 'figures', 'fft.png')),
                                    'mffthist':Image.open(os.path.join('documentation', 'figures', 'ffthist.png')),
                                    'peakcomp':Image.open(os.path.join('documentation', 'figures', 'peakcomp.png')),
                                    'fftmirror':Image.open(os.path.join('documentation', 'figures', 'fftmirror.png')),
                                    'fftdiff':Image.open(os.path.join('documentation', 'figures', 'fftdiff.png')),
									'specdiff':Image.open(os.path.join('documentation', 'figures', 'specdiff.png')),
                                    'binpower':Image.open(os.path.join('documentation', 'figures', 'binpower.png')),
                                    'binhist':Image.open(os.path.join('documentation', 'figures', 'dhistband.png')),
                                    'fbinplot':Image.open(os.path.join('documentation', 'figures', 'fbinplot.png')),}

""" 
Defined analyses for multiple sounds case (n > 2)
"""

# Pre determined analyses for multiple sounds
multi_sound_analysis_names = {'msignal':'Tracer la courbe des sons',
                              'menvelope':"Tracer l'enveloppe des sons",
                              'mlogenv':"Tracer l'enveloppe logarithmique des sons",
                              'mfft':'Tracer le spectre fréquentiel des sons (FFT)',
                              'mffthist':"Tracer l'histogramme du spectre fréquentiel des sons (FFT)",
                              'mfbinplot':'Tracer les bandes de fréquence',
                              'mbinpower':'Comparer la puissance des bandes de fréquence',
                              'mbinhist':'Histogramme des bandes de fréquences',}

multi_sound_analysis_functions  = {'msignal':plot_with_soundpack(Plot.signal),
                                   'menvelope':plot_with_soundpack(Plot.envelope),
                                   'mlogenv':plot_with_soundpack(Plot.log_envelope),
                                   'mfft':plot_with_soundpack(Plot.fft),
                                   'mffthist':plot_with_soundpack(Plot.fft_hist),
                                   'mfbinplot':SoundPack.freq_bin_plot,
                                   'mbinpower':SoundPack.integral_plot,
                                   'mbinhist':SoundPack.bin_power_hist,}

multi_sound_analysis_help = {'msignal':load_md(os.path.join('documentation', 'signal.md')),                             
                             'menvelope':load_md(os.path.join('documentation', 'envelope.md')),                             
                             'mlogenv':load_md(os.path.join('documentation', 'logenvelope.md')),
                             'mfft':load_md(os.path.join('documentation', 'fft.md')),
                             'mffthist':load_md(os.path.join('documentation', 'binfft.md')),
                             'mfbinplot':load_md(os.path.join('documentation', 'fbinplot.md')),
                             'mbinpower':load_md(os.path.join('documentation', 'binpower.md')),
                             'mbinhist':load_md(os.path.join('documentation', 'histband.md')),}

multi_sound_analysis_help_figures = {'msignal':Image.open(os.path.join('documentation', 'figures', 'signal.png')),
                                     'menvelope':Image.open(os.path.join('documentation', 'figures', 'envelope.png')),
                                     'mlogenv':Image.open(os.path.join('documentation', 'figures', 'logenv.png')),
                                     'mfft':Image.open(os.path.join('documentation', 'figures', 'fft.png')),
                                     'mffthist':Image.open(os.path.join('documentation', 'figures', 'ffthist.png')),
                                     'mfbinplot':Image.open(os.path.join('documentation', 'figures', 'fbinplot.png')),
                                     'mbinpower':Image.open(os.path.join('documentation', 'figures', 'binpower.png')),
                                     'mbinhist':Image.open(os.path.join('documentation', 'figures', 'dhistband.png')),}


""" 
Defined headers for the .docx report generation
Should maybe be moved
"""
# Report headers corresponding to all the analyses
all_report_headers  = {'mfbinplot':'Amplitude des Bandes de fréquences selon le temps',
                       'mbinpower':'Puissance des bandes de fréquences selon le temps',
                       'mbinhist':"Histogramme de l'amplitude des bandes de fréquence",
                       'peakcomp':'Comparaison des pics du spectre fréquentiel (FFT) des deux sons',
                       'fftmirror':'Comparaison du spectre fréquentiel (FFT) de deux sons en mirroir',
                       'fftdiff':'Comparaison du spectre fréquentiel (FFT) de deux sons',
                       'binpower':'Comparaison de la puissance des bandes de fréquence',
                       'binhist':'Histogramme de la puissance des bandes de fréquence',
                       'fbinplot':'Graphique des bandes de fréquence',
                       'signal':'Courbe du signal selon le temps',
                       'msignal':'Courbe des sons selon le temps',
                       'envelope':"Enveloppe du signal selon le temps",
                       'menvelope':"Enveloppe des sons selon le temps",
                       'logenv':"Enveloppe logarithmique selon le temps",
                       'mlogenv':"Enveloppe logarithmique des sons selon le temps",
                       'fft':'Spectre fréquentiel du son (FFT)',
                       'mfft':'Spectre fréquentiel des sons (FFT)',
                       'ffthist':"Histogramme du spectre fréquentiel (FFT) du son",
                       'mffthist':"Histogramme du spectre fréquentiel (FFT) des sons",
                       'peaks':"Analyse des pics du spectre fréquentiel (FFT) du son",
                       'timedamp':"Amortissement temporel du son",
                       'plotband':"Graphique des bandes de fréquence du son",
                       'histband':"Histogramme des bandes de fréquence"}
